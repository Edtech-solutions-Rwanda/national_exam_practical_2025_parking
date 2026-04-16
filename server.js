const express=require('express');
const cors=require('cors');
const session=require('express-session');
const mysql=require('mysql2');
const bcrypt=require('bcryptjs');

const app=express();
const PORT=5000;

app.use(express.json());
app.use(cors());
app.use(session({
    secret:"secret1",
    resave:false,
    saveUnitialized:false,
    cookie:{secure:false}
}))


const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'PSSMS'
});

db.connect((err)=>{
    if(err){
        console.log('db error')
        return;
    }
    console.log('MYSQL connected')
})

//auth users table

app.post('/api/register',async (req,res)=>{
    const {username,password}=req.body;
    const hash = await bcrypt.hash(password,10);
    db.query('INSERT INTO users (username,password) VALUES (?,?)',[username,hash],(err)=>{
        if(err){
            return res.status(400).json({error:'username taken chose another'})
        }
        res.json({message:"registered succesfully"})
    })
})

app.post('/api/login',(req,res)=>{
    const {username,password}=req.body;
    db.query('SELECT * FROM users WHERE username=?',[username],async(err,results)=>{
      if(err|| results.length===0) return res.status(401).json({error:"invalid credintials"})
        
        const match = await bcrypt.compare(password,results[0].password)
        if(!match) return res.status(401).json({error:"invalid credintials"})
         req.session.user={id:results[0].userid,username};
        res.json({message:"login successfull", user: req.session.user})
        
    })
})

app.post('/api/logout',(req,res)=>{
    req.session.destroy();
    res.json({message:"logged out"})
})


//cars

app.post('/api/cars',(req,res)=>{
    const {platenumber,drivername,phonenumber}=req.body
    db.query('INSERT INTO car VALUES (?,?,?)',[platenumber,drivername,phonenumber],(err)=>err ? res.status(400).json({error:err.message}) : res.json({message:"car added"}))
})


app.get('/api/cars',(req,res)=>{
    db.query('SELECT * FROM car',(err,results)=>res.json(results))
})
// ── PARKING SLOT ──────────────────────────────────────
app.post('/api/slots', (req, res) => {
  const { slotnumber, slotstatus } = req.body;
  db.query('INSERT INTO parkingslot VALUES (?,?)', [slotnumber, slotstatus],
    (err) => err ? res.status(400).json({ error: err.message }) : res.json({ message: 'Slot added' }));
});

app.get('/api/slots', (req, res) => {
  db.query('SELECT * FROM parkingslot', (err, results) => res.json(results));
});

//parkingrecord

app.post('/api/records',(req,res)=>{
    const {platenumber,slotnumber,entrytime}=req.body
    db.query('INSERT INTO parkingrecord (platenumber,slotnumber,entrytime) VALUES (?,?,?)',[platenumber,slotnumber,entrytime],(err,result)=>{
        if(err)return res.status(400).json({error:err.message})
            db.query('UPDATE parkingslot SET slotstatus="occupied" WHERE slotnumber=?',[slotnumber])
        res.json({message:"Record created"})

    })
})

app.get('/api/records',(req,res)=>{
       db.query('SELECT pr.*, c.drivername FROM parkingrecord pr JOIN car c ON pr.platenumber=c.platenumber',(err,results)=>res.json(results) )
})

app.put('/api/records/:id',(req,res)=>{
    const{exittime}=req.body
    const {id}=req.params
    db.query('SELECT * FROM parkingrecord where recordid=? ',[id],(err,rows)=>{
        if(err||rows.length===0) return res.status(404).json({error:"record not found"})

           const entry= new Date(rows[0].entrytime)
           const exit =new Date(exittime);

           const hours = Math.ceil((exit-entry)/3600000)

           const duration = ((exit-entry)/3600000).toFixed(2)
           const amount =hours*500

           db.query('UPDATE parkingrecord SET exittime=?, duration=? WHERE recordid=?',[exittime,duration,id],()=>{
            db.query('UPDATE parkingslot SET slotstatus="available" WHERE slotnumber=?', [rows[0].slotnumber]);

            db.query('INSERT INTO payment (recordid,amountpaid,paymentdate) VALUES (?,?,CURDATE())',[id,amount],(err,results)=>res.json ({message:"exit recorded"})
            )
           })
    })
})

app.delete('/api/records/:id', (req, res) => {
  db.query('DELETE FROM parkingrecord WHERE recordid=?', [req.params.id],
    (err) => err ? res.status(400).json({ error: err.message }) : res.json({ message: 'Deleted' }));
});

// ── PAYMENT ───────────────────────────────────────────
app.post('/api/payments', (req, res) => {
  const { recordid, amountpaid, paymentdate } = req.body;
  db.query('INSERT INTO payment (recordid, amountpaid, paymentdate) VALUES (?,?,?)',
    [recordid, amountpaid, paymentdate],
    (err) => err ? res.status(400).json({ error: err.message }) : res.json({ message: 'Payment added' }));
});

app.get('/api/payments', (req, res) => {
  db.query('SELECT p.*, pr.platenumber, pr.entrytime, pr.exittime, pr.duration FROM payment p JOIN parkingrecord pr ON p.recordid=pr.recordid',
    (err, results) => res.json(results));
});

// ── REPORTS ───────────────────────────────────────────
app.get('/api/report/daily', (req, res) => {
  const { date } = req.query;
  const target = date || new Date().toISOString().split('T')[0];
  db.query(
    `SELECT pr.platenumber, pr.entrytime, pr.exittime, pr.duration, p.amountpaid
     FROM Payment p JOIN parkingrecord pr ON p.recordid=pr.recordid
     WHERE DATE(p.paymentdate)=?`,
    [target],
    (err, results) => res.json(results));
});

app.get('/api/report/bill/:recordid', (req, res) => {
  db.query(
    `SELECT pr.platenumber, pr.entrytime, pr.exittime, pr.duration, p.amountpaid, p.paymentdate
     FROM parkingrecord pr JOIN Payment p ON pr.recordid=p.recordid
     WHERE pr.recordid=?`,
    [req.params.recordid],
    (err, results) => results.length ? res.json(results[0]) : res.status(404).json({ error: 'Not found' }));
});

app.listen(PORT,()=>console.log('server is running'))