var socket;
var id;
var selfIndex;

var circle;
var food = [];
var enemies = [];
var slowScale = 1;
var bullets = [];


function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  //start socket connection to the server
  socket = io.connect('http://localhost:2000');

  circle = new Circle(random(-1900,1900), random(-1900,1900), 64, 100);
  
  var data = {
    x: circle.pos.x,
    y: circle.pos.y,
    r: circle.r,
    health: circle.health
  };

  //send start to server to add circle to array
  socket.emit('start', data);

  //gets the enemies from server list
  socket.on('heartbeat', function(data){
    enemies = data;
  });

  //gets the food from the server list
  socket.on('dinner', function(data){
    food = data;
  });

}

function draw() {
  background(0);

  //translate the position to the center
  translate(width/2, height/2);
  slowScale = lerp(slowScale, (32 / circle.r), 0.1);

  //scale the world as your character grows
  scale(slowScale);
  
  //set selfIndex
  for (var i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].id == socket.id) {
      selfIndex = i;
    }
  }
  
  //reset your circle if it dies
  if (circle.health <= 0) {
    circle.pos.x = random(-2000,2000);
    circle.pos.y = random(-2000,2000);
    enemies[selfIndex].health = 100;

    //emit the update health data for enemies
    socket.emit('enemyUpdate', selfIndex, enemies[selfIndex].health);    
  }

  //translate the position of the character
  translate(-circle.pos.x, -circle.pos.y);
  
  //show bullet and move it
  for(var i = bullets.length - 1; i >= 0; i--) {
    for (var j = enemies.length - 1; j >= 0; j--) {
      if (bullets[i]) {
        if (bullets[i].x > 2000 || bullets[i].y > 2000 || bullets[i].x < -2000 || bullets[i].y < -2000){
          bullets.splice(i,1);
        }
      }
      if (bullets[i]) {      
        if (bullets[i].hit(enemies[j]) && enemies[j].id !== socket.id) {
          enemies[j].health -= 5;
          
          //emit the update health data for enemies
          socket.emit('enemyUpdate', j, enemies[j].health);
          bullets.splice(i,1);
        }
      } 
      if (bullets[i]) {
        bullets[i].showBullet();
        bullets[i].move();
      }
    }
  }

  //draw the enemies on screen
  for (var i = enemies.length - 1; i >=0; i--){
    var enemId = enemies[i].id;
    if(enemId !== socket.id){
      fill(255, 0, 0);
      ellipse(enemies[i].x, enemies[i].y, enemies[i].r * 2, enemies[i].r * 2);

      //shows health
      fill(255);
      textAlign(CENTER);
      textSize(30);
      text(enemies[i].health,enemies[i].x, enemies[i].y);
    }
  }

  //show initial circle and update position when moved
  circle.showCircle();
  circle.update();
  circle.constrain();

  //gets circle data and sends it to update pos in server
  var data = {
    x: circle.pos.x,
    y: circle.pos.y,
    r: circle.r,
  };
  socket.emit('update', data);

  //show your own health
  for (var i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].id == socket.id) {
      circle.health = enemies[i].health;
    }
  }
  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(30);
  text(circle.health, circle.pos.x, circle.pos.y);

  //show all little dots to eat
  for (var i = food.length - 1; i >= 0; i--) {

    //if food is eaten remove it and add new random food
    if (circle.eat(food[i])) {
      //reassign own health
     if(enemies.length != 0){
      if (food[i].r == 16) {
        enemies[selfIndex].health = enemies[selfIndex].health + 15;
      }
      else {
        enemies[selfIndex].health = enemies[selfIndex].health - 5;
      }
      
      //emit the update health data for enemies
      socket.emit('enemyUpdate', selfIndex, enemies[selfIndex].health);

      food.splice(i, 1);
    }

      var size;
      if(random(0,10) < 8){
        size = 12;
      } else {
        size = 16
      }

      //create object to push onto food
      var foodData = {
        id: 0,
        x: random(-2000,2000),
        y: random(-2000,2000),
        r: size
      };
    
      food.push(foodData);
    }
    else {
      if(food[i].r == 16){
        //show green food
        fill(100,255,0);
        ellipse(food[i].x, food[i].y, food[i].r * 2, food[i].r * 2);
      } else {
        //show white food
        fill(255);
        rect(food[i].x, food[i].y, food[i].r * 2, food[i].r * 2);
      }
    }
  }
  
  //only update if food array has food in it
  if(food.length != 0){
    socket.emit('foodUpdate', food);
  }
}

//allows for the screen to be resized and not mess up the drawing
function windowResized(){
  resizeCanvas(window.innerWidth, window.innerHeight);
}

function mousePressed(){
  if(mouseIsPressed){
    var bullet = new Bullet(circle.pos.x, circle.pos.y);
    bullets.push(bullet);
  }
}
