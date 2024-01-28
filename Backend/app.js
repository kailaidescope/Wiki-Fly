import express from "express";
import axios from "axios"
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { uuid } from 'uuidv4';
import cors from "cors";

const app = express();

const corsOptions = {
    origin: 'chrome-extension://ogjcjamkpgdcaceljfmegbdgnjlpadaf',
    methods: 'GET', // Specify the allowed HTTP methods
    allowedHeaders: 'Content-Type', // Specify the allowed headers
  };

app.use(cors(corsOptions));
const port = 3000;
const database = 'mongodb://127.0.0.1:27017/WikiFly'

const wikiAPI = axios.create({
    baseURL: 'https://en.wikipedia.org/api/rest_v1/page/',
    headers: {}
  });

// const chatgptAPI = axios.create({
//     baseURL: 'https://some-domain.com/api/',
//     timeout: 1000,
//     headers: {}
//   });

await mongoose.connect(database); 

const userSchema = new mongoose.Schema({
    token: String,
    wordQlen: Number,
    wordQs: [{ id : Number, word: String}]
});

const User = mongoose.model(
  "User",
  userSchema
);

// Query for word wiki summary
app.get("/wordQ", async (req, res) => {
    let word = req.query.word;
    let token = req.query.token;
    let apiResQ = await wikiAPI.get(`summary/${word}`);
    let apiResR = await wikiAPI.get(`related/${word}`);
    if (apiResQ != null){
        let resDataQ = apiResQ.data;
        let resDataR = apiResR.data.pages;
        let answer = {
            ans: {
                title: resDataQ.title,
                link: resDataQ.content_urls.desktop.page,
                description: resDataQ.extract
            },
            L1:{
                title: resDataR[0].title,
                link: resDataR[0].content_urls.desktop.page,
                description: resDataR[0].extract
            },
            L2:{
                title: resDataR[1].title,
                link: resDataR[1].content_urls.desktop.page,
                description: resDataR[1].extract
            }
        }
        // for (let i = 0; i < resDataR.length; i++) {
        //     const currentObject = resDataR[i];
          
        //     // Append the current object to the resultObject using a key based on the 'id' property
        //     answer[`L${i}`] = {
        //         title: currentObject.title,
        //         link: currentObject.content_urls.desktop.page,
        //         description: currentObject.extract
        //     };
        //   }
        res.send({data : answer});
    }else{
        res.send({data: {title: "Could not find article."}})
    }
    //add word to the database
    const balls = await User.findOne({ token: token});
    if(balls != null){
        balls.wordQs.push({id: balls.wordQlen, word: word});
        balls.wordQlen = balls.wordQlen + 1;
    }
})

//(to be changed) Query for Articles 
app.get("/articleQ", async (req, res) => {
    
})

// create user authorization token for user who hasn't got one
app.get("/auth/tokenReq", async (req, res) => {
    while(true){
        //create new token 
        const newToken = uuid();
        //check for uniqueness in database
        const balls = await User.findOne({ token: newToken});
        //if unique send back to user & create user entry
        if(balls === null){
            const newUser = new User({
                token: newToken,
                wordQlen:0,
                wordQs: [] 
              }); 
            await newUser.save();
            res.send({token:newToken});
            break;
        }
    }
})

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
  });