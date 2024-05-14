// 获取画布和上下文
var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext("2d");

// 获取UI元素
var gameOverScreen = document.getElementById("gameOver");
var gameWinScreen = document.getElementById("gameWin");
var lifeDisplay = document.getElementById("life");
var scoreDisplay = document.getElementById("score");
var goldDisplay = document.getElementById("gold");
var shopPanel = document.getElementById("shopPanel");
var shopItems = document.getElementById("shopItems");

// 设置画布尺寸
var aspectRatio = 16 / 9; // 16:9的长宽比

function resizeCanvas() {
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;

    // 根据长宽比调整画布尺寸
    if (screenWidth / screenHeight > aspectRatio) {
        canvas.width = screenHeight * aspectRatio;
        canvas.height = screenHeight;
    } else {
        canvas.width = screenWidth;
        canvas.height = screenWidth / aspectRatio;
    }

    // 居中画布
    canvas.style.marginTop = (screenHeight - canvas.height) / 2 + "px";
    canvas.style.marginLeft = (screenWidth - canvas.width) / 2 + "px";
}

// 初始化画布尺寸
resizeCanvas();

// 监听窗口大小变化事件
window.addEventListener("resize", function() {
    resizeCanvas();
});

// 定义玩家对象
var player = {
    x: canvas.width / 2,
    y: canvas.height - 50, // 开始时放在地面
    width: 50,
    height: 50,
    speed: 5,
    gravity: 0.2, // 重力加速度
    velocityY: 0, // 垂直速度
    life: 3, // 生命值
    gold: 0 // 金币数量
};

// 定义敌人对象列表
var enemies = [];

// 定义匕首对象列表
var daggers = [];

// 定义钱袋对象列表
var bags = [];

// 定义胜利对象
var goal = {
    x: canvas.width - 70,
    y: canvas.height - 70,
    width: 50,
    height: 50
};

// 定义键盘状态对象，用于记录按键状态
var keys = {};

// 游戏状态
var gameOver = false;
var gameWin = false;

// 积分
var score = 0;

// 监听键盘按下和松开事件
document.addEventListener("keydown", function(event) {
    keys[event.key] = true;

    // 监听J键或者Z键发射匕首
    if (event.key === "j" || event.key === "z") {
        shootDagger(event);
    }
});

document.addEventListener("keyup", function(event) {
    keys[event.key] = false;
});

// 监听鼠标点击事件，获取鼠标位置
canvas.addEventListener("click", shootDagger);

// 更新生命值显示
function updateLifeDisplay() {
    var lifeText = "";
    for (var i = 0; i < player.life; i++) {
        lifeText += "❤️";
    }
    lifeDisplay.innerHTML = lifeText;
}

// 更新积分显示
function updateScoreDisplay() {
    scoreDisplay.innerHTML = `积分: ${score}`;
}

// 更新金币显示
function updateGoldDisplay() {
    goldDisplay.innerHTML = `金币: ${player.gold}`;
}

// 检查碰撞函数
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// 更新人物位置函数
function update() {
    if (gameOver || gameWin) return;

    // 应用重力
    player.velocityY += player.gravity;
    
    // 根据按键调整人物位置
    if ((keys["ArrowUp"] || keys["w"]) && player.y >= canvas.height - player.height) {
        // 当按下上键或W键且人物在地面上时，施加向上的力
        player.velocityY = -8; // 设置一个较大的向上速度，模拟跳跃效果
    }
    
    if (keys["ArrowLeft"] || keys["a"]) {
        if (player.x > 0) {
            player.x -= player.speed;
        }
    }
    
    if (keys["ArrowRight"] || keys["d"]) {
        if (player.x + player.width < canvas.width) {
            player.x += player.speed;
        }
    }

    // 更新人物的垂直位置
    player.y += player.velocityY;
    
    // 确保人物在画布内部
    if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.velocityY = 0;
    }

    // 更新敌人位置和生命值
    enemies.forEach(enemy => {
        if (enemy.x < player.x) {
            enemy.x += enemy.speed;
        } else {
            enemy.x -= enemy.speed;
        }

        if (enemy.y < player.y) {
            enemy.y += enemy.speed;
        } else {
            enemy.y -= enemy.speed;
        }

        // 检查与敌人的碰撞
        if (checkCollision(player, enemy)) {
            player.life -= 1;
            updateLifeDisplay();
            if (player.life <= 0) {
                gameOver = true;
                gameOverScreen.style.display = "block";
            } else {
                // 重置玩家位置
                player.x = canvas.width / 2;
                player.y = canvas.height - 50;
                player.velocityY = 0;
            }
        }
    });

    // 更新匕首位置
    daggers.forEach((dagger, index) => {
        dagger.x += dagger.vx;
        dagger.y += dagger.vy;

        // 移除超过边界的匕首
        if (dagger.x < 0 || dagger.x > canvas.width || dagger.y < 0 || dagger.y > canvas.height) {
            daggers.splice(index, 1);
        }

        // 检查匕首与敌人的碰撞
        enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(dagger, enemy)) {
                // 减少敌人生命值
                enemy.life -= dagger.damage;
                if (enemy.life <= 0) {
                    enemies.splice(enemyIndex, 1);
                    score += 1;
                    updateScoreDisplay();
                    // 20%概率生成钱袋
                    if (Math.random() < 0.2) {
                        spawnBag(enemy.x, enemy.y);
                    }
                }
                daggers.splice(index, 1);
            }
        });
    });

    // 更新钱袋位置
    bags.forEach((bag, index) => {
        bag.y += bag.gravity;

        // 检查钱袋与玩家的距离
        var dx = bag.x - player.x;
        var dy = bag.y - player.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.width) {
            bag.vx = (player.x - bag.x) / distance * 5;
            bag.vy = (player.y - bag.y) / distance * 5;
            bag.x += bag.vx;
            bag.y += bag.vy;
        }

        // 检查钱袋与玩家的碰撞
        if (checkCollision(player, bag)) {
            player.gold += bag.value;
            updateGoldDisplay();
            bags.splice(index, 1);
        }
    });

    // 检查与胜利方块的碰撞
    if (checkCollision(player, goal)) {
        gameWin = true;
        gameWinScreen.style.display = "block";
    }
}

// 发射匕首函数
function shootDagger(event) {
    if (gameOver || gameWin) return;

    var rect = canvas.getBoundingClientRect();
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    var angle = Math.atan2(mouseY - player.y, mouseX - player.x);

    var dagger = {
        x: player.x,
        y: player.y,
        width: 20,
        height: 20,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        damage: 1 // 匕首初始伤害
    };

    daggers.push(dagger);
}

// 渲染函数，用于绘制人物、敌人、匕首、钱袋和胜利方块
function draw() {
    if (gameOver || gameWin) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制人物
    ctx.font = "50px Arial";
    ctx.fillText("🥷", player.x, player.y + player.height);

    // 绘制敌人（骷髅emoji）
    enemies.forEach(enemy => {
        ctx.fillText("💀", enemy.x, enemy.y + enemy.height);
    });

    // 绘制胜利方块（👸）
    ctx.fillText("👸", goal.x, goal.y + goal.height);

    // 绘制匕首
    daggers.forEach(dagger => {
        ctx.fillText("🗡️", dagger.x, dagger.y + dagger.height);
    });

    // 绘制钱袋
    bags.forEach(bag => {
        ctx.fillText("💰", bag.x, bag.y + bag.height);
    });
}

// 生成新敌人
function spawnEnemy() {
    if (gameOver || gameWin) return;

    // 确保敌人生成位置距离玩家至少5个身位
    var newEnemy;
    do {
        newEnemy = {
            x: Math.random() * (canvas.width - 50),
            y: Math.random() * (canvas.height - 50),
            width: 50,
            height: 50,
            speed: 2, // 敌人速度
            life: 1 // 敌人初始生命值
        };
    } while (Math.abs(newEnemy.x - player.x) < player.width * 5 && Math.abs(newEnemy.y - player.y) < player.height * 5);

    enemies.push(newEnemy);
}

// 生成钱袋
function spawnBag(x, y) {
    var newBag = {
        x: x,
        y: y,
        width: 30,
        height: 30,
        gravity: 0.1,
        value: Math.floor(Math.random() * (player.gold + 1) + 1), // 金币数量随着游戏时长线性增长
        vx: 0,
        vy: 0
    };

    bags.push(newBag);
}

// 每10秒增加敌人的生命值
function increaseEnemyLife() {
    enemies.forEach(enemy => {
        enemy.life += 1;
    });
}

// 主循环
function gameLoop() {
    // 更新人物位置
    update();
    
    // 渲染画面
    draw();
}

// 启动游戏循环，取消按住按键的连续移动延迟
setInterval(gameLoop, 1000 / 60);

// 每3秒生成一个新的敌人
setInterval(spawnEnemy, 3000);

// 每10秒增加敌人的生命值
setInterval(increaseEnemyLife, 10000);

// 重新开始游戏函数
function restartGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
    player.velocityY = 0;
    player.life = 3;
    player.gold = 0;
    score = 0;
    updateLifeDisplay();
    updateScoreDisplay();
    updateGoldDisplay();
    enemies = [];
    daggers = [];
    bags = [];
    spawnEnemy(); // 立即生成一个敌人
    gameOver = false;
    gameWin = false;
    gameOverScreen.style.display = "none";
    gameWinScreen.style.display = "none";
}

// 打开商店面板
function openShop() {
    shopPanel.style.display = "block";
}

// 关闭商店面板
function closeShop() {
    shopPanel.style.display = "none";
}

// 购买升级物品函数
function buyUpgrade(type) {
    switch(type) {
        case 'life':
            if (player.gold >= 10) {
                player.gold -= 10;
                player.life += 1;
                updateLifeDisplay();
                updateGoldDisplay();
            }
            break;
        case 'speed':
            if (player.gold >= 10) {
                player.gold -= 10;
                player.speed += 1;
                updateGoldDisplay();
            }
            break;
        case 'dagger':
            if (player.gold >= 10) {
                player.gold -= 10;
                daggers.forEach(dagger => dagger.damage += 1);
                updateGoldDisplay();
            }
            break;
        case 'enemySlow':
            if (player.gold >= 10) {
                player.gold -= 10;
                enemies.forEach(enemy => enemy.speed -= 0.5);
                updateGoldDisplay();
            }
            break;
        case 'gold':
            if (player.gold >= 10) {
                player.gold -= 10;
                player.gold += Math.floor(Math.random() * 10 + 1);
                updateGoldDisplay();
            }
            break;
    }
}

// 初始化商店物品列表
function initShopItems() {
    shopItems.innerHTML = `
        <li><button onclick="buyUpgrade('life')">生命值升级 (10金币)</button></li>
        <li><button onclick="buyUpgrade('speed')">移动速度升级 (10金币)</button></li>
        <li><button onclick="buyUpgrade('dagger')">匕首伤害升级 (10金币)</button></li>
        <li><button onclick="buyUpgrade('enemySlow')">敌人减速升级 (10金币)</button></li>
        <li><button onclick="buyUpgrade('gold')">金币数量升级 (10金币)</button></li>
    `;
}

// 初始化游戏
function initGame() {
    resizeCanvas();
    updateLifeDisplay();
    updateScoreDisplay();
    updateGoldDisplay();
    initShopItems();
    spawnEnemy();
}

// 启动游戏
initGame();
