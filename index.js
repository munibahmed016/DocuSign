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

app.post("/form", async(req, res) =>{

    await checkToken(req);
        let envelopesApi = new getEnvelopesApi(req);
        let envelope = makeEnvelope(req.body.name, req.body.email);
        let results = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, {
          envelopeDefinition: envelope,
        });
      console.log("envelope results", results);
      let viewRequest = makeRecipientViewRequest(req.body.name, req.body.email);
results = await envelopesApi.createRecipientView(process.env.ACCOUNT_ID, results.envelopeId, {
  recipientViewRequest: viewRequest,
});
res.redirect(results.url);
});

function getEnvelopesApi (req){
let dsApiClient = new docusign.ApiClient();
dsApiClient.setBasePath(process.env.BASE_PATH);
dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);
return new docusign.EnvelopesApi(dsApiClient);
}

function createTabs(){
    let list1 = docusign.List.constructFromObject({
        value: 'green',
        documentId: '1',
        pageNumber: '1',
        tabLabel: 'list',
      });
      
      // Checkboxes
      let check1 = docusign.Checkbox.constructFromObject({
          tabLabel: 'ckAuthorization',
          selected: 'true',
        });
        let check3 = docusign.Checkbox.constructFromObject({
          tabLabel: 'ckAgreement',
          selected: 'true',
        });
      // The NOde.js SDK has a bug so it cannot create a Number tab at this time.
      // number1 = docusign.Number.constructFromObject({
      //    tabLabel: "numbersOnly", value: '54321'});
      let radioGroup = docusign.RadioGroup.constructFromObject({
        groupName: 'radio1',
        // You only need to provide the radio entry for the entry you're selecting
        radios: [
          docusign.Radio.constructFromObject({ value: 'white', selected: 'true' }),
        ],
      });
     
      
      // We can also add a new tab (field) to the ones already in the template:
      let textExtra = docusign.Text.constructFromObject({
        document_id: '1',
        page_number: '1',
        x_position: '280',
        y_position: '172',
        font: 'helvetica',
        font_size: 'size14',
        tab_label: 'added text field',
        height: '23',
        width: '84',
        required: 'false',
        bold: 'true',
        value: args.signerName,
        locked: 'false',
        tab_id: 'name',
      });

      let text = docusign.Text.constructFromObject({
        tabLabel: 'Company_Name',
        value: 'Jabberwocky!',
      });
      
      // Pull together the existing and new tabs in a Tabs object:
      let tabs = docusign.Tabs.constructFromObject({
        textTabs: [text],
      });
      // Create the template role elements to connect the signer and cc recipients
      // to the template
      let signer = docusign.TemplateRole.constructFromObject({
        email: args.signerEmail,
        name: args.signerName,
        roleName: 'signer',
        clientUserId: args.signerClientId, // change the signer to be embedded
        tabs: tabs, // Set tab values
      });
      // Create a cc template role.
      let cc = docusign.TemplateRole.constructFromObject({
        email: args.ccEmail,
        name: args.ccName,
        roleName: 'cc',
      });
      // Add the TemplateRole objects to the envelope object
      envelopeDefinition.templateRoles = [signer, cc];
      // Create an envelope custom field to save the our application's
      // data about the envelope
      let customField = docusign.TextCustomField.constructFromObject({
          name: 'app metadata item',
          required: 'false',
          show: 'true', // Yes, include in the CoC
          value: '1234567',
        });
        let customFields = docusign.CustomFields.constructFromObject({
          textCustomFields: [customField],
        });
      envelopeDefinition.customFields = customFields;
      
      return envelopeDefinition;
      
};

function makeEnvelope(name, email) {
      let env = new docusign.EnvelopeDefinition();
    env.templateId = process.env.TEMPLATE_ID;

    let signer1 = docusign.TemplateRole.constructFromObject({
      email: email,
      name: name,
      clientUserId: process.env.CLIENT_USER_ID ,
      roleName: 'Applicant',
    });
  
    // // Create a cc template role.
    // // We're setting the parameters via setters
    // let cc1 = new docusign.TemplateRole();
    // cc1.email = args.ccEmail;
    // cc1.name = args.ccName;
    // cc1.roleName = 'cc';
  
    // Add the TemplateRole objects to the envelope object
    env.templateRoles = [signer1];
    env.status = 'sent';
  
    return env;
  }

  function makeRecipientViewRequest(name, email) {

  
    let viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = "http://localhost:8000/success";
 
    viewRequest.authenticationMethod = 'none';
  
    viewRequest.email = email;
    viewRequest.userName = name;
    viewRequest.clientUserId = process.env.CLIENT_USER_ID;

    return viewRequest;
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

app.get("/success", (req, res) =>{
    res.send("success");
})

app.listen(PORT = 8000, ()=>{
    console.log("Server is working", process.env.USER_ID);
})

// http://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=1e46403b-0fb4-4072-aaac-e210547884c7&redirect_uri=http://localhost:8000/