/**
* @jest-environment jsdom
*/


// All Node Modules Used are Required first over here.
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local")
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-find-or-create");
const cookieParser = require('cookie-parser');
const _ = require('lodash');
const { MongoClient } = require("mongodb");
const { json } = require("body-parser");
const { get } = require("lodash");
const { Redirect } = require("request/lib/redirect");
const { use } = require("passport");
const mongooseTypeUrl = require('mongoose-type-url');
const findorcreate = require("mongoose-find-or-create/lib/findorcreate");



// Create Server
const app = express()

// Server Config
app.use(express.static("public"));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());


// App Session Config
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: (21 * 24 * 60 * 60 * 1000) },
}));


// Database Connection
try {
    mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
    console.log("Database Connected...")
} catch (err) {
    console.log(err);
}


// Student, Projects, Schemas
const studentSchema = mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: String,
    grade: Number,
    profileImg: String,
    projects: [{
        type: String
    }]
})

const projectSchema = mongoose.Schema({
    projectName: { type: String, required: true },
    projectDescription: { type: String, required: true },
    projectImages: [{
        type: mongoose.SchemaTypes.Url, required: true
    }],
    projectCategory: { type: Array, required: true },
    projectTags: { type: Array, required: true },
    projectAuthor: { type: String }
});


// Plugins To Schema
studentSchema.plugin(passportLocalMongoose);
studentSchema.plugin(findOrCreate);

projectSchema.plugin(passportLocalMongoose);
projectSchema.plugin(findorcreate);


// Collection/Model Construction
const Student = mongoose.model("Student", studentSchema);

const Project = mongoose.model("Project", projectSchema);


// Local authentication strategy
passport.use(new LocalStrategy({
    usernameField: 'email', // use email as the username field
    passwordField: 'password'
},
    Student.authenticate()
));


// Session serializing and deserializing
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    Student.findById(id, function (err, student) {
        done(err, student);
    });
});


app.use(passport.session());
app.use(passport.initialize());


// New Student
app.get("/newStudent", function (req, res) {
    res.render("newstudent")
});

// New Student Add Route
app.post('/newStudent', (req, res) => {
    const { studentName, studentEmail, studentPassword, studentGrade, studentImgPath } = req.body;
    const newStudent = new Student({ username: studentName, email: studentEmail, grade: studentGrade, profileImg: studentImgPath });
    Student.register(newStudent, studentPassword, (err) => {
        if (err) {
            console.log(err);
            return res.redirect('/newStudent');
        }
        passport.authenticate('local')(req, res, () => {
            console.log('Authenticated');
            res.redirect('/profile');
        });
    });
});


// New Project Route
app.get("/newProject", function (req, res) {
    res.render("newProject")
});


// New Project Add Route
app.post("/newProject", function (req, res) {
    // Create a new Project object using the request body
    var newProject = new Project({
        projectName: req.body.projectName,
        projectDescription: req.body.projectDescription,
        projectImages: req.body.projectImgPath.split(", "),
        projectCategory: req.body.projectCategory,
        projectTags: req.body.projectTags.split(", "),
    });

    // Save the new Project object to the database
    newProject.save(function (err) {
        if (err) {
            console.log(err);
            res.redirect("/newProject");
        } else {
            console.log("New project added to database");
            res.redirect("/profile");
        }
    });
});



// Student Profile
app.get("/profile", function (req, res) {
    res.send("Profile");
});


// Home Route
app.get("/", function (req, res) {
    var Display = {}
    const featuredQuery = { projectTags: "project" }
    const otherQuery = { projectTags: "project" }

    Student.find()
        .then(students => {
            Display.students = _.sampleSize(students, students.length);

            return Project.find(featuredQuery)
        }).then(featuredProject => {
            Display.featuredProjects = _.sampleSize(featuredProject, featuredProject.length);

            return Project.find(otherQuery)
        }).then(allProjects => {
            Display.projects = _.sampleSize(allProjects, allProjects.length);

            res.render("home", { display: Display })
        });
});


// App Running
app.listen(process.env.PORT || 8000, function () {
    console.log("Server has started...")
});
