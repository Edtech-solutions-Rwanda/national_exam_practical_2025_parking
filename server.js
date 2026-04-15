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




app.listen(PORT,()=>console.log('server is running'))