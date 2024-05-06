const express = require ("express");
const path = require ("path");
const bodyParser = require ("body-parser");
const dotenv = require ("dotenv");
const docusign = require ("docusign-esign");
const fs = require ("fs");
const session = require("express-session");

dotenv.config();

const app =express();
app.use (bodyParser.urlencoded({extended:true}));
app.use(session({
    secret: "fsfs78943dsdsa",
    resave: true,
    saveUninitialized: true,
}));

app.post("/form", (req, res) =>{
    console.log("recived from data ", req.body);
    res.send("recived");
});

function getEnvelopesApi (req){
let dsApiClient = new docusign.ApiClient();
dsApiClient.setBasePath(process.env.BASE_PATH);
dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);
return new docusign.EnvelopesApi(dsApiClient);
}

async function checkToken (req){
    if (req.session.access_token && Date.now() < req.session.expires_at){
        console.log("re-using access_token", req.session.access_token);
    }else{
console.log("generating a new access_token");
        
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.BASE_PATH);
    const results = await dsApiClient.requestJWTUserToken(
        process.env.INTEGRATION_KEY,
        process.env.USER_ID,
        "signature",
        fs.readFileSync(path.join(__dirname,"private.key")),
        3600);
        console.log(results.body);
        req.session.access_token = results.body.access_token;
        req.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000; 
    }
}

app.get("/", async (req, res)=>{
   await checkToken (req);
    res.sendFile(path.join (__dirname, "main.html"));
});

app.listen(PORT = 8000, ()=>{
    console.log("Server is working", process.env.USER_ID);
})

// http://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=1e46403b-0fb4-4072-aaac-e210547884c7&redirect_uri=http://localhost:8000/