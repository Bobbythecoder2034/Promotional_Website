const express = require('express')
const fs = require('fs/promises')
const path = require('path')
const morgan = require('morgan')
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

const app = express()
const PORT = 5000

//Path to the submissions.json
const database = path.join(__dirname, 'submissions.json')

//Middleware
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
if(localStorage.getItem("Database") !== undefined){
    // writeDB(JSON.parse(localStorage.getItem("Database")))
}
//Routes
app.get('/',(req,res)=>{
    res.status(200).json({
        message:"Submission API is Running",
        endpoints:["/sumbissions (GET, POST)", "/submissions/:name (GET, POST, PUT, DELETE"]
    })
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
app.get('/submissions',async(req,res)=>{
    try {
        const submissions = await readDB()
        res.status(200).json(submissions)
    } catch (err){
        console.error(err)
        res.status(500).json({error:"Server Failed to read all submissions"})
    }
})

/**
 * Get /submissions/:name
 * Purpose: Read a single submissionname
 * METHOD: GET
 * URL PARAM:name
 * RESPONSE: 200 ok + JSON object or 404
 */
app.get('/submissions/:name',async(req,res)=>{
    try{
        const submissions = await readDB()
        const submission = submissions.find(s => s.name === Number(req.params.name))
        if(!submission){
            return res.status(404).json({error:"submission not Found"})
        }
        res.status(200).json(submission)
    }catch(err){
        console.error(err)
        res.status(500).json({error:"Server failed to read submissions"})
    }
})

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
        if(submissions.some(s => s.name.toLowerCase() ==name.toLowerCase())){
            return res.status(409).json({
                error:"Name already exists"
            })
        }
        
        const newSubmission = {name, email, newsOrInfo}
        submissions.push(newSubmission)
        await writeDB(submissions)
        res.status(201).json(newSubmission)
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
app.use((req, res) => {
    res.status(404).json({error:"Page not found"}); 
});

function toString(){
    const datas = JSON.stringify(readDB())
    localStorage.setItem("Database", datas);
}

//Start Server
app.listen(PORT,()=>{console.log(`Server is listening on http://localhost:${PORT}`)})
