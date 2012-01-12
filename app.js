
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.cookieParser());
  app.use(express.session({ secret: "keyboard cat" }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){

  // sort a random shape for the captcha and save it on the session
  var shapes = ['triangle', 'x', 'rectangle', 'circle', 'check', 'caret', 'zigzag', 'arrow', 'leftbracket', 'rightbracket', 'v', 'delete', 'star', 'pigtail'];
  var shape = shapes[Math.floor(Math.random() * (shapes.length) )];
  req.session.shape = shape;

  res.render('index', {
    error: req.param('error'),
    shape: shape
  });
});

app.post('/send', function(req, res){

  var $1 = require('./dollar.js') // require $1 Unistroke Recognizer
    , points = req.param('_points') // get the points submitted on the hidden input
    , _points_xy = points.split('|')
    , _points = [];

  // convert to an array of Points
  for(p in _points_xy){
    var xy = _points_xy[p].split(',');
    _points.push(new $1.Point(parseInt(xy[0]), parseInt(xy[1])));
  }

  // test the points
  var _r = new $1.DollarRecognizer();
  var result = _r.Recognize(_points);

  // validates the captcha or redirect
  if(_points.length >= 10 && result.Score > 0.7 && result.Name == req.session.shape){ // valid
    res.render('send');
  }else{
    res.redirect('/?error=true');
  }
  
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
