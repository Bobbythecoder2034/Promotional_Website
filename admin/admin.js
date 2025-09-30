
$(function(){
    fetch(
        './data/notApproved'
    ).then(
        response => response.json()
    ).then(
        data => {
            const toBe = data;
        }
    ).catch(
        error => console.error('Error fetching JSON:', error)
    );
    fetch(
        './data/approved'
    ).then(
        response => response.json()
    ).then(
        data => {
        const approved = data
        }
    ).catch(
        error => console.error('Error fetching JSON:', error)
    );
      
    $("body").on("click", ".good-button", function(){
        const userID = $(this).parent().attr("id")
        if(approved.find(x=>{
            return x.id == userID
        })){
            alert("Already Approved")
        }else{
            let temp = approved.find(x=>{
                return x.id == userID
            })
            temp.status == "approved"
            $(`#status${userID}`).innerHTML("approved")
        }
    })
    $("body").on("click", ".bad-button", function(){
        const userID = $(this).parent().attr("id")
    })
    function makeCard(id, name, email, preference, status){
        $("#users").append(`<section class = "card" id = "${id}"><div class = "title" id = "name${id}">${name}<div class = "subtitle" id = "status${id}">${status}</div></div><p id = "email${id}">Email: ${email}</p><p id = "preference${id}">Preference: ${preference}</p><p id = "id${id}">ID: ${id}</p><button class = "delete-button" id = "bad-button${id}">Delete</button><button class = "approve-button" id = "good-button${id}">Approve</button></section>`)
    }
    
})