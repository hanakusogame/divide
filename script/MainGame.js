"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
//メインのゲーム画面
var MainGame = /** @class */ (function (_super) {
    __extends(MainGame, _super);
    function MainGame(scene) {
        var _this = this;
        var tl = require("@akashic-extension/akashic-timeline");
        var timeline = new tl.Timeline(scene);
        _this = _super.call(this, { scene: scene, x: 0, y: 0, width: 640, height: 360 }) || this;
        var bg = new g.FilledRect({
            scene: scene,
            width: 640,
            height: 360,
            cssColor: "black",
            opacity: 0.5
        });
        _this.append(bg);
        var panelSize = 80;
        //出す数字の設定
        var arrNum = [];
        for (var i = 2; i <= 40; i++) {
            for (var j = 2; j <= 40; j++) {
                if (i != j && ((i % j) === 0 || (j % i) === 0)) {
                    arrNum.push(i);
                }
            }
        }
        console.log(arrNum);
        var base = new g.E({ scene: scene });
        _this.append(base);
        //手札を置く場所
        var areas = [];
        var _loop_1 = function (i) {
            var panel = new g.Sprite({
                scene: scene,
                x: 430,
                y: (panelSize + 10) * i + 70,
                src: scene.assets["map"],
                touchable: true
            });
            areas.push(panel);
            base.append(panel);
            panel.pointDown.add(function () {
                if (!scene.isStart)
                    return;
                if (i === 0 && !panel.tag) {
                    nowPanelNum = i;
                    next();
                    nowPanelNum = 1;
                }
                else {
                    nowPanelNum = i;
                    sprCursor.y = panel.y - 5;
                    sprCursor.modified();
                }
                scene.playSound("se_move");
            });
        };
        for (var i = 0; i < 2; i++) {
            _loop_1(i);
        }
        //ネクストブロック
        for (var i = 0; i < 4; i++) {
            var panel = new g.Sprite({
                scene: scene,
                x: 70 * i + 430,
                y: 240,
                src: scene.assets["map"],
                scaleX: 0.8,
                scaleY: 0.8,
            });
            areas.push(panel);
            base.append(panel);
        }
        //キープ
        var sprKeep = new g.Sprite({
            scene: scene,
            src: scene.assets["keep"],
            y: 20
        });
        areas[0].append(sprKeep);
        //キープと一番目の切り替え用
        var sprCursor = new g.Sprite({
            scene: scene,
            x: 430 - 5,
            y: 70 - 5 + 90,
            src: scene.assets["cursor"]
        });
        base.append(sprCursor);
        //エフェクト
        var effects = [];
        for (var i = 0; i < 10; i++) {
            var effect = new Effect(scene, panelSize);
            effects.push(effect);
        }
        //
        var dx = [0, 1, 0, -1];
        var dy = [-1, 0, 1, 0];
        var comboCnt = 0;
        var isStop = false; //移動中やコンボ中にパネルを置けないようにするフラグ
        var nowPanelNum = 1; //0:キープ 1:一番上
        //割れるかどうかチェック
        var chkDivide = function () {
            var isDivide = false;
            //割る数を格納する配列作成
            var list = [];
            for (var y = 0; y < 6; y++) {
                list[y] = [];
                for (var x = 0; x < 6; x++) {
                    list[y][x] = [];
                }
            }
            //割る数を格納
            for (var y = 1; y < maps.length - 1; y++) {
                for (var x = 1; x < maps[y].length - 1; x++) {
                    if (!maps[y][x].tag)
                        continue;
                    var num2 = maps[y][x].tag.num;
                    for (var i = 0; i < 4; i++) {
                        var map = maps[y + dy[i]][x + dx[i]];
                        if (!map.tag)
                            continue;
                        var num1 = map.tag.num;
                        if ((num1 % num2) === 0) {
                            list[y][x].push(num2);
                            list[y + dy[i]][x + dx[i]].push(num2);
                            maps[y][x].tag.frameNumber = 1;
                            maps[y][x].tag.modified();
                            maps[y + dy[i]][x + dx[i]].tag.frameNumber = 1;
                            maps[y + dy[i]][x + dx[i]].tag.modified();
                            isDivide = true;
                        }
                    }
                }
            }
            return ({ flg: isDivide, list: list });
        };
        //詰みチェックとリスタート処理
        var mate = function () {
            //詰みチェック
            var isMate = true;
            var arr = [];
            for (var y = 1; y < maps.length - 1; y++) {
                for (var x = 1; x < maps[y].length - 1; x++) {
                    if (!maps[y][x].tag) {
                        isMate = false;
                        break;
                    }
                    arr.push(maps[y][x].tag);
                }
                if (!isMate)
                    break;
            }
            if (isMate) {
                sprMate.show();
                scene.addScore(-3000);
                timeline.create().every(function (a, b) {
                    var p = arr[Math.floor((arr.length - 1) * b)];
                    if (p.frameNumber === 0) {
                        p.frameNumber = 2;
                        p.modified();
                    }
                }, 1000);
                scene.setTimeout(function () {
                    sprMate.hide();
                    start();
                }, 2500);
                scene.playSound("biri");
            }
            else {
                isStop = false;
            }
        };
        var score = 0; //スコア加算用
        //割る処理
        var divide = function (list) {
            var panelCnt = 0; //割れたパネルの数カウント用
            //割る
            for (var y = 1; y < maps.length - 1; y++) {
                for (var x = 1; x < maps[y].length - 1; x++) {
                    var panel = maps[y][x].tag;
                    if (!panel || list[y][x].length === 0)
                        continue;
                    var num = panel.num;
                    var sortList = list[y][x].filter(function (x, i, self) {
                        return self.indexOf(x) === i;
                    }).sort(function (a, b) { return b - a; });
                    for (var i = 0; i < sortList.length; i++) {
                        if ((num % sortList[i]) !== 0)
                            continue;
                        num = num / sortList[i];
                        if (num === 1)
                            break;
                    }
                    if (num === 1) {
                        maps[y][x].tag = undefined;
                        panels.push(panel);
                    }
                    panel.setNum(num);
                    var effect = effects.pop();
                    base.append(effect);
                    effect.startEffect(panel);
                    effects.unshift(effect);
                    panel.frameNumber = 0;
                    panel.modified();
                    panelCnt++;
                    if (panelCnt <= 2) {
                        score += 200 * comboCnt;
                    }
                    else {
                        score += (200 + ((panelCnt - 2) * 40)) * comboCnt;
                    }
                }
            }
            //消したパネルの数表示
            sprNum.show();
            labelNum.text = "" + panelCnt;
            labelNum.invalidate();
            scene.setTimeout(function () {
                sprNum.hide();
            }, 800);
            scene.playSound("se_hit");
            var d = chkDivide();
            if (d.flg) {
                scene.setTimeout(function () {
                    comboCnt++;
                    //連鎖数表示
                    if (comboCnt >= 2) {
                        sprCombo.show();
                        labelCombo.text = "" + comboCnt;
                        labelCombo.invalidate();
                        scene.setTimeout(function () {
                            sprCombo.hide();
                        }, 800);
                    }
                    divide(d.list); //再帰させて連鎖
                }, 800);
            }
            else {
                scene.addScore(score);
                mate();
            }
        };
        //手札をずらす
        var next = function () {
            for (var i = nowPanelNum; i < areas.length - 1; i++) {
                var p = areas[i + 1].tag;
                areas[i].tag = p;
                timeline.create(p).moveTo(areas[i].x, areas[i].y, 200).con()
                    .scaleTo(areas[i].scaleX, areas[i].scaleY, 200);
            }
            var np = panels.pop();
            var area = areas[areas.length - 1];
            np.x = area.x;
            np.y = area.y;
            np.scale(area.scaleX);
            np.setNum(arrNum[scene.random.get(0, arrNum.length - 1)]);
            np.modified();
            base.append(np);
            area.tag = np;
        };
        //盤面
        var maps = [];
        for (var y = 0; y < 6; y++) {
            maps[y] = [];
            var _loop_2 = function (x) {
                var panel = new g.Sprite({
                    scene: scene,
                    x: panelSize * x + 0,
                    y: panelSize * y - 60,
                    src: scene.assets["map"],
                    touchable: true
                });
                maps[y][x] = panel;
                if (x > 0 && y > 0 && x < 5 && y < 5) {
                    base.append(panel);
                }
                //クリックイベント
                panel.pointDown.add(function () {
                    if (isStop || !scene.isStart)
                        return;
                    if (panel.tag != undefined) {
                        scene.addScore(-100);
                        var p_1 = panel.tag;
                        p_1.frameNumber = 2;
                        p_1.modified();
                        scene.playSound("se_miss");
                        return;
                    }
                    var p = areas[nowPanelNum].tag;
                    panel.tag = p;
                    isStop = true;
                    timeline.create(p).moveTo(panel.x, panel.y, 180).wait(200).call(function () {
                        comboCnt = 1;
                        score = 0;
                        var d = chkDivide();
                        if (d.flg) {
                            scene.setTimeout(function () {
                                divide(d.list);
                            }, 200);
                        }
                        else {
                            mate();
                        }
                    });
                    //手札をずらす
                    if (nowPanelNum === 0) {
                        nowPanelNum = 1;
                        sprCursor.y = areas[nowPanelNum].y - 5;
                        areas[0].tag = undefined;
                    }
                    else {
                        next();
                    }
                    scene.playSound("se_move");
                });
                panel.pointUp.add(function () {
                    if (isStop || !scene.isStart)
                        return;
                    if (panel.tag != undefined) {
                        var p = panel.tag;
                        p.frameNumber = 0;
                        p.modified();
                        return;
                    }
                });
            };
            for (var x = 0; x < 6; x++) {
                _loop_2(x);
            }
        }
        //枠
        var waku = new g.Sprite({
            scene: scene,
            src: scene.assets["waku"],
            x: 80 - 10,
            y: 20 - 10,
        });
        base.append(waku);
        //設置するパネル
        var panels = [];
        var panels_bk = [];
        for (var i = 0; i < 22; i++) {
            var panel = new Panel(scene, panelSize);
            panels_bk[i] = panel;
        }
        //消したパネルの数
        var sprNum = new g.Sprite({
            scene: scene,
            src: scene.assets["combo"],
            width: 108,
            height: 40,
            srcY: 0,
            x: 210,
            y: 50
        });
        _this.append(sprNum);
        sprNum.hide();
        var labelNum = new g.Label({
            scene: scene,
            font: scene.numFontB,
            text: "0",
            fontSize: 40,
            x: -40
        });
        sprNum.append(labelNum);
        //連鎖数
        var sprCombo = new g.Sprite({
            scene: scene,
            src: scene.assets["combo"],
            width: 108,
            height: 40,
            srcY: 40,
            x: 210,
            y: 100
        });
        _this.append(sprCombo);
        sprCombo.hide();
        var labelCombo = new g.Label({
            scene: scene,
            font: scene.numFontP,
            text: "0",
            fontSize: 40,
            x: -40
        });
        sprCombo.append(labelCombo);
        //詰み表示
        var sprMate = new g.Sprite({
            scene: scene,
            src: scene.assets["combo"],
            width: 108,
            height: 40,
            srcY: 80,
            x: 200,
            y: 130
        });
        _this.append(sprMate);
        sprMate.hide();
        var labelMate = new g.Label({
            scene: scene,
            font: scene.numFontR,
            text: "-3000",
            fontSize: 32,
            x: -40,
            y: 50
        });
        sprMate.append(labelMate);
        _this.finish = function () {
        };
        var start = function () {
            panels.length = 0;
            panels_bk.forEach(function (p) {
                if (p.parent)
                    p.remove();
                panels.push(p);
            });
            //盤面クリア
            for (var y = 1; y < maps.length - 1; y++) {
                for (var x = 1; x < maps[y].length - 1; x++) {
                    maps[y][x].tag = undefined;
                }
            }
            nowPanelNum = 1;
            //キープクリア
            areas[0].tag = undefined;
            //手札の設定
            for (var i = 1; i < areas.length; i++) {
                var p = areas[i];
                var panel = panels.pop();
                panel.x = p.x;
                panel.y = p.y;
                panel.scale(p.scaleX);
                panel.setNum(arrNum[scene.random.get(0, arrNum.length - 1)]);
                panel.modified();
                base.append(panel);
                p.tag = panel;
            }
            isStop = false;
        };
        //リセット
        _this.reset = function () {
            start();
        };
        return _this;
    }
    return MainGame;
}(g.E));
exports.MainGame = MainGame;
//エフェクトクラス
var Effect = /** @class */ (function (_super) {
    __extends(Effect, _super);
    function Effect(scene, panelSize) {
        var _this = _super.call(this, {
            scene: scene,
            width: panelSize,
            height: panelSize,
            angle: 15
        }) || this;
        var tl = require("@akashic-extension/akashic-timeline");
        var timeline = new tl.Timeline(scene);
        var effects = [];
        var size = panelSize / 2;
        for (var i = 0; i < 4; i++) {
            var effect = new g.FilledRect({
                scene: scene,
                x: size * (i % 2),
                y: size * (Math.floor(i / 2)),
                width: size,
                height: size,
                cssColor: "yellow",
                opacity: 0.8
            });
            effect.hide();
            effects.push(effect);
            _this.append(effect);
        }
        //エフェクト表示
        var dx = [-1, 1, -1, 1];
        var dy = [-1, -1, 1, 1];
        _this.startEffect = function (panel) {
            _this.x = panel.x;
            _this.y = panel.y;
            _this.modified();
            var _loop_3 = function (i) {
                var effect = effects[i];
                effect.x = size * (i % 2);
                effect.y = size * (Math.floor(i / 2));
                effect.show();
                timeline.create(effect).wait(100).moveBy(dx[i] * size, dy[i] * size, 300).call(function () {
                    effect.hide();
                });
            };
            for (var i = 0; i < 4; i++) {
                _loop_3(i);
            }
        };
        return _this;
    }
    return Effect;
}(g.E));
//パネルクラス
var Panel = /** @class */ (function (_super) {
    __extends(Panel, _super);
    function Panel(scene, panelSize) {
        var _this = _super.call(this, {
            scene: scene,
            width: panelSize,
            height: panelSize,
            frames: [0, 1, 2],
            src: scene.assets["panel"]
        }) || this;
        _this.num = 0;
        //数字ラベル
        var label = new g.Label({
            scene: scene,
            y: 20,
            font: scene.numFontK,
            fontSize: 38,
            textAlign: g.TextAlign.Center,
            widthAutoAdjust: false,
            width: panelSize - 2,
            text: "1"
        });
        _this.append(label);
        //数字セット
        _this.setNum = function (num) {
            if (num != 1) {
                _this.frameNumber = 0;
                _this.num = num;
                _this.modified();
                label.text = "" + num;
                label.invalidate();
                _this.show(); //いまいち
            }
            else {
                _this.hide();
            }
        };
        return _this;
    }
    return Panel;
}(g.FrameSprite));
