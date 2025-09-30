const express = require('express')
const fs = require('fs/promises')
const {readFileSync, writeFileSync} = require('fs')
const path = require('path')
const morgan = require('morgan')
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

const app = express()
const PORT = 5000

//Path to the submissions.json
const database = path.join(__dirname, './data/submissions.json')
const trueDatabase = path.join(__dirname, './data/approvedSubmissions.json')
const adminBase = path.join(__dirname,"./data/admin.json")
// Middleware
app.use(express.urlencoded({extended:true}))
app.use(express.json())

// Static Folder
app.use(express.static(path.join(__dirname,"public")))



//Part 1: Parse JSON request body when the client send Content-Type: application.json
app.use(express.json())
//Part 2: Request logger through morgan
app.use(morgan(":method :url :status :res[content-length] - :response-time ms"))
//Part 3: Tiny custom logger but when we use middleware we must also use the next(), this tells the server that when the middleware has completed its task, it should continue the process
app.use((req,res,next)=>{
    //log the core request parts
    console.log("\n--- Incoming Request ---")
    console.log("Method:",req.method)
    console.log("URL:",req.url)
    console.log("Headers:",req.headers)
    console.log("Body:",req.body)

    //After the response is sent we log the status code
    res.on("finish", ()=>{
        console.log("--- Outgoing Response ---")
        console.log("Status:", res.statusCode)
        console.log("-----------------------------\n")
    })

    next()
})

//Helper functions to read/write the submissions.json file

async function readDB(){
    const rawData = await fs.readFile(database, 'utf-8')
    return JSON.parse(rawData)
}

async function writeDB(data){
    const text = JSON.stringify(data, null, 2)
    await fs.writeFile(database, text, 'utf-8')
}
app.post('/admin',(req,res)=>{
    const {username, password} = req.body
    const admins = readFileSync(adminBase, 'utf-8')
    const checkDatabase = JSON.parse(admins).find(x=>{
        return (x.username == username && x.password == password)
    })
    if(checkDatabase){
        res.sendFile(path.join(__dirname,"admin/admin.html"))
    }else{
        res.status(401).json({error:"Invalid Login"})
    }
})
app.post('/customer/special',(req,res)=>{
    const {name, email} = req.body
    const people = readFileSync(trueDatabase, 'utf-8')
    const checkDatabase = JSON.parse(people).find(x=>{
        return (x.name == name && x.email == email)
    })
    if(checkDatabase){
        res.status(200).json({nothing:"Page in Progress"})
    }else{
        res.status(401).json({error:"Invalid Login"})
    }
})

app.post('/home',(req,res)=>{
    res.sendFile(path.join(__dirname,"public/home.html"))
})

app.get('/admin/css',(req,res)=>{
    res.sendFile(path.join(__dirname,"./admin/admin.css"))
})
app.get('/admin/node',(req,res)=>{
    res.sendFile(path.join(__dirname,"./app.js"))
})
app.get('/admin/script',(req,res)=>{
    res.sendFile(path.join(__dirname,"./admin/admin.js"))
})
app.get('/data/approved',(req,res)=>{
    res.sendFile(path.join(__dirname,"./data/approvedSubmissions.json"))
})
app.get('/data/notApproved',(req,res)=>{
    res.sendFile(path.join(__dirname,"./data/submissions.json"))
})
/*
*GET /submissions
*Purpose: Read all submissions
*METHOD: GET
*URL:/submissions
*REQUEST HEADERS: may include Accept:application/json
*REQUEST BODY: none
*RESPONSE: 200 OPK + JSON Array
*/
// app.get('/submissions',async(req,res)=>{
//     try {
//         const submissions = await readDB()
//         res.status(200).json(submissions)
//     } catch (err){
//         console.error(err)
//         res.status(500).json({error:"Server Failed to read all submissions"})
//     }
// })



/**
 * POST /submissions
 * Purpose: create a new submission( add to the file)
 * METHOD: POST (create a new resource)
 * URL: /submissions
 * REQUEST HEADERS: Content-Type: application/json
 * REQUEST BODY: JSON with requred fields for (name, firstName, lastName, year)
 * RESPONSE: 201 Created + JSON of created submission
 */
app.post('/submissions',async(req,res)=>{
    try{
        const {name, email, newsOrInfo} = req.body
        //Validate the information (idiot proofing)
        if(!name || !email || !newsOrInfo){
            return res.status(400).json({error: "Invalid Body. Required:name, email, newsOrInfo"})
        }
        const submissions = await readDB()
        if(submissions.some(s => s.name.toLowerCase() == name.toLowerCase())){
            return res.status(409).json({
                error:"Name already exists"
            })
        }
        const newSubmission = {
            ...req.body,
            
            status: "new",
            id: (Date.now().toString(36)+Math.random().toString(36).slice(2,8).toUpperCase())
        }
        submissions.push(newSubmission)
        await writeDB(submissions)
        res.redirect(`http://localhost:${PORT}`)
        toString()
    }catch(err){
        console.error(err)
        return res.status(500).json({
            error:"Server cannot add submission"
        })
    }
})

/**
 * PUT /submissions/:name
 * Purpose: Update an existing submission byname (replace fields)
 * METHOD: PUT (idempotent - multiple identical requests result in same state)
 * URL: /submission/:name
 * REQUEST BODY: JSON with fields to update (firsName, lastName, year)
 * RESPONSE 200 OK + JSON of updated submission or 404 if not
 */

app.put('/submissions/:name', async (req,res) => {
    try{
        const {email, newsOrInfo} = req.body
        const submissions = await readDB()
        const idx = submissions.findIndex(s => s.name == req.params.name)
        if(idx == - 1){
            return res.status(404).json({error: "submission not found"})
        }

        //only update provided fields
        if(email !== undefined && emailCheck(email) !== undefined){submissions[idx].email = email}
        if(newsOrInfo !== undefined){submissions[idx].newsOrInfo = newsOrInfo}

        await writeDB(submissions)
        res.status(202).json(submissions[idx])
        toString()
    }catch(err){
        console.error(err)
        return res.status(500).json({
            error:"Server cannot add submission"
        })
    }
})
function emailCheck(x){
    return x.match(/^[^\s]+@[^\s]+\.(com|org|gov|edu)$/)
}
/**
 * DELETE /submissions/:name
 * Purpose: Remove a submission
 * METHOD: DELETE
 * URL: /submission/:name
 * REQUEST BODY: none
 * RESPONSE 200 OK + JSON of deleted submission or 404 if not
 */
app.delete('/submissions/:name', async (req,res) => {
    try{
        const submissions = await readDB()
        const idx = submissions.findIndex(s => s.name == req.params.name)
        if(idx == - 1){
            return res.status(404).json({error: "submission not found"})
        }

        const temp = submissions[idx]
        submissions.splice(idx,1)
        await writeDB(submissions)
        res.status(202).json(temp)
        toString()
    }catch(err){
        console.error(err)
        return res.status(500).json({
            error:"Server cannot remove submission"
        })
    }
})


/**
 * 404
 * Purpose: handle any urls
 * METHOD: USE
 * URL: any 
 * REQUEST BODY: none
 * RESPONSE 404
 */


function toString(){
    const datas = JSON.stringify(readDB())
    localStorage.setItem("Database", datas);
}
app.use('/',(req,res)=>{
    res.sendFile(path.join(__dirname,"public/login.html"))
})
app.use((req, res) => {
    res.status(404).json({error:"Page not found"}); 
});
//Start Server
app.listen(PORT,()=>{console.log(`Server is listening on http://localhost:${PORT}`)})
