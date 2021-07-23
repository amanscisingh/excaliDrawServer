const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');


const PORT = process.env.PORT || 3100;

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//Mongo URI
const MongoURI = 'mongodb+srv://aman:gocoronago@cluster0.igxci.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

//create mongo connection
const con = mongoose.createConnection( process.env.MONGODB_URI || MongoURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true 
});

con.then( () => { app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} and DB is connected as well!!!`) 
}); } )

//INIT gfs
let gfs;
con.once('open', () => {
    //initialize stream
    gfs = Grid(con.db, mongoose.mongo);
    gfs.collection('uploads');
});


//create storage engine
const storage = new GridFsStorage({
    url: MongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
}   
});   
const upload = multer({ storage });


app.use(cors());


// @route/GET /
// desc / get files from db and renders on the frontend
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files
        if ( !files ||  files.length === 0 ) {
            res.render('index', { files:false });
        }
        else {
            files.map((file) => {
                if (file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
                    file.isImage = true
                } else {
                    file.isImage = false
                }
            });
            res.render('index', { files:files });
        }
    });
});

// @route /upload 
// desc / upload image from excalidraw
app.post('/upload', upload.single('file'), (req, res) => {
    console.log(req.files);
    res.send("everything fine");
  });
  
  


// @route/POST /uploadManual
// desc / upload image manually
app.post('/uploadManual', upload.single('file'), (req, res) => {
    res.redirect('/');
});


// @route GET /files
// desc / get all files in json format
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files
        if ( !files ||  files.length === 0 ) {
            return res.status(404).json({
                err: "No files found"
            });
        }
        else {
            return res.json(files);
        }
    });
});

// @route GET /files
// desc / get one file in json format
app.get('/files/:fileName', (req, res) => {
    gfs.files.findOne({ filename: req.params.fileName }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "File not found"
            });

        } else {
            return res.json(file);
        }
     })
});


// @route GET /image
// desc / displays one image -> this will be used further while loading all images on frontend
app.get('/image/:fileName', (req, res) => {
    gfs.files.findOne({ filename: req.params.fileName }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "File not found"
            });

        } else {
            // check if image
            if (file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
                // read output to browser
                const readStream = gfs.createReadStream(file.filename);
                readStream.pipe(res);
            } else {
                return res.status(404).json({
                    err: "Not an Image"
                });
            }
        }
     })
});


// @route DELETE /files/_id
// desc deletes the image
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: "uploads"  }, (err, file) => {
        if (err) {
            return res.status(404).json({
                err: err
            });
        }
        res.redirect('/');
    });
});


// code for HEROKU
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client_exceldraw/build'));
}
