import { MainScene } from "./MainScene";
import { SceneComment } from "@atsumaru/api-types";
declare function require(x: string): any;

//メインのゲーム画面
export class MainGame extends g.E {
	public reset: () => void;
	public finish: () => void;
	public setMode: (num: number) => void;

	constructor(scene: MainScene) {
		const tl = require("@akashic-extension/akashic-timeline");
		const timeline = new tl.Timeline(scene);
		super({ scene: scene, x: 0, y: 0, width: 640, height: 360 });

		const bg = new g.FilledRect({
			scene: scene,
			width: 640,
			height: 360,
			cssColor: "black",
			opacity: 0.5
		});
		this.append(bg);

		const panelSize = 80;

		//出す数字の設定
		const arrNum: number[] = [];
		for (let i = 2; i <= 40; i++) {
			for (let j = 2; j <= 40; j++) {
				if (i != j && ((i % j) === 0 || (j % i) === 0)) {
					arrNum.push(i);
				}
			}
		}
		//console.log(arrNum);

		const base = new g.E({ scene: scene });
		this.append(base);

		//手札を置く場所
		const areas: g.Sprite[] = [];
		for (let i = 0; i < 2; i++) {
			const panel = new g.Sprite({
				scene: scene,
				x: 430,
				y: (panelSize + 10) * i + 70,
				src: scene.assets["map"],
				touchable: true
			});
			areas.push(panel);
			base.append(panel);

			panel.pointDown.add(() => {
				if (!scene.isStart) return;
				if (i === 0 && !panel.tag) {
					nowPanelNum = i;
					next();
					nowPanelNum = 1;
				} else {
					nowPanelNum = i;
					sprCursor.y = panel.y - 5;
					sprCursor.modified();
				}
				scene.playSound("se_move");
			});
		}

		//ネクストブロック
		for (let i = 0; i < 4; i++) {
			const panel = new g.Sprite({
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
		const sprKeep = new g.Sprite({
			scene: scene,
			src: scene.assets["keep"],
			y: 20
		});
		areas[0].append(sprKeep);

		//キープと一番目の切り替え用
		const sprCursor = new g.Sprite({
			scene: scene,
			x: 430 - 5,
			y: 70 - 5 + 90,
			src: scene.assets["cursor"]
		});
		base.append(sprCursor);

		//エフェクト
		const effects: Effect[] = [];
		for (let i = 0; i < 10; i++) {
			const effect = new Effect(scene, panelSize);
			effects.push(effect);
		}

		//
		const dx = [0, 1, 0, -1];
		const dy = [-1, 0, 1, 0];
		let comboCnt = 0;
		let isStop = false //移動中やコンボ中にパネルを置けないようにするフラグ
		let nowPanelNum = 1;//0:キープ 1:一番上

		//割れるかどうかチェック
		const chkDivide = () => {
			let isDivide = false;

			//割る数を格納する配列作成
			const list: number[][][] = [];
			for (let y = 0; y < 6; y++) {
				list[y] = [];
				for (let x = 0; x < 6; x++) {
					list[y][x] = [];
				}
			}

			//割る数を格納
			for (let y = 1; y < maps.length - 1; y++) {
				for (let x = 1; x < maps[y].length - 1; x++) {
					if (!maps[y][x].tag) continue;
					const num2 = (maps[y][x].tag as Panel).num;
					for (let i = 0; i < 4; i++) {
						let map = maps[y + dy[i]][x + dx[i]];
						if (!map.tag) continue;
						const num1 = (map.tag as Panel).num;
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

		}

		//詰みチェックとリスタート処理
		const mate = () => {
			//詰みチェック
			let isMate = true;
			let arr: Panel[] = [];
			for (let y = 1; y < maps.length - 1; y++) {
				for (let x = 1; x < maps[y].length - 1; x++) {
					if (!maps[y][x].tag) {
						isMate = false;
						break;
					}
					arr.push(maps[y][x].tag);
				}
				if (!isMate) break;
			}
			if (isMate) {

				sprMate.show();

				scene.addScore(-3000);

				timeline.create().every((a: number, b: number) => {
					const p = arr[Math.floor((arr.length - 1) * b)];
					if (p.frameNumber === 0) {
						p.frameNumber = 2;
						p.modified();
					}
				}, 1000);

				scene.setTimeout(() => {
					sprMate.hide();
					start();
				}, 2500);

				scene.playSound("biri");
			} else {
				isStop = false;
			}
		}

		let score = 0;//スコア加算用

		//割る処理
		const divide = (list: number[][][]) => {

			let panelCnt = 0//割れたパネルの数カウント用
			//割る
			for (let y = 1; y < maps.length - 1; y++) {
				for (let x = 1; x < maps[y].length - 1; x++) {
					const panel = maps[y][x].tag as Panel;
					if (!panel || list[y][x].length === 0) continue;
					let num = panel.num;

					const sortList = list[y][x].filter((x, i, self) => {
						return self.indexOf(x) === i;
					}).sort((a, b) => b - a);

					for (let i = 0; i < sortList.length; i++) {
						if ((num % sortList[i]) !== 0) continue;
						num = num / sortList[i];
						if (num === 1) break;
					}

					if (num === 1) {
						maps[y][x].tag = undefined;
						panels.push(panel);
					}

					panel.setNum(num);
					const effect = effects.pop();
					base.append(effect);
					effect.startEffect(panel);
					effects.unshift(effect);

					panel.frameNumber = 0;
					panel.modified();

					panelCnt++;

					if (panelCnt <= 2) {
						score += 400 * ((comboCnt+1) * (comboCnt/4));
					} else {
						score += (400 + (panelCnt - 2) * 40) * ((comboCnt+1) * (comboCnt/4));
					}

				}
			}

			//消したパネルの数表示
			sprNum.show();
			labelNum.text = "" + panelCnt;
			labelNum.invalidate();
			scene.setTimeout(() => {
				sprNum.hide();
			}, 800);

			scene.playSound("se_hit");

			const d = chkDivide();
			if (d.flg) {
				scene.setTimeout(() => {
					comboCnt++;

					//連鎖数表示
					if (comboCnt >= 2) {
						sprCombo.show();
						labelCombo.text = "" + comboCnt;
						labelCombo.invalidate();
						scene.setTimeout(() => {
							sprCombo.hide();
						}, 800);
					}

					divide(d.list);//再帰させて連鎖
				}, 800);
			} else {
				scene.addScore(score);
				mate();

				if (advancePos) {
					move(maps[advancePos.y][advancePos.x]);
					advancePos = undefined;
				} else {
					cursorArea.hide();
				}
			}
		}

		//手札をずらす
		const next = () => {
			for (let i = nowPanelNum; i < areas.length - 1; i++) {
				const p: Panel = areas[i + 1].tag;
				areas[i].tag = p;
				timeline.create(p).moveTo(areas[i].x, areas[i].y, 200).con()
					.scaleTo(areas[i].scaleX, areas[i].scaleY, 200);
			}

			const np: Panel = panels.pop();
			const area = areas[areas.length - 1];
			np.x = area.x;
			np.y = area.y;
			np.scale(area.scaleX);
			np.setNum(arrNum[scene.random.get(0, arrNum.length - 1)]);
			np.modified();

			base.append(np);
			area.tag = np;
		}

		//先行入力用
		let advancePos: { x: number, y: number }

		//先行入力場所表示用
		const cursorArea = new g.FilledRect({
			scene: scene,
			width: panelSize,
			height: panelSize,
			cssColor: "white",
			opacity:0.5
		});
		cursorArea.hide();

		const move = (panel: g.Sprite) => {
			const area = areas[nowPanelNum];
			const p: Panel = areas[nowPanelNum].tag;
			panel.tag = p;

			isStop = true;
			//timeline.create(p).moveTo(panel.x, panel.y, 180).wait(200).call(() => {
			p.angle = 7;
			p.modified();

			shadow.moveTo(p.x, p.y);
			base.append(shadow);

			base.append(p);

			timeline.create(shadow).moveTo(panel.x,panel.y,400).con().every((a: number, b: number) => {
				p.x = panel.x + (area.x - panel.x) * (1 - b);
				const y = Math.pow((1 - ((Math.abs(b - 0.5)) * 2)), 0.5) * -100;
				p.y = panel.y + (area.y - panel.y) * (1 - b) + y;
				p.modified();
			}, 500, tl.Easing.easeInOutQubic).call(() => {
				p.angle = 0;
				p.modified();
			}).wait(200).call(() => {
				comboCnt = 1;
				score = 0;
				const d = chkDivide();
				if (d.flg) {
					scene.setTimeout(() => {
						divide(d.list);
					}, 200);
				} else {
					mate();

					if (advancePos) {
						move(maps[advancePos.y][advancePos.x]);
						advancePos = undefined;
					}
				}
			});

			//手札をずらす
			if (nowPanelNum === 0) {
				nowPanelNum = 1;
				sprCursor.y = areas[nowPanelNum].y - 5;
				areas[0].tag = undefined;
			} else {
				next();
			}

			scene.playSound("se_move");
		}

		//盤面
		const maps: g.Sprite[][] = [];
		for (let y = 0; y < 6; y++) {
			maps[y] = [];
			for (let x = 0; x < 6; x++) {
				const map = new g.Sprite({
					scene: scene,
					x: panelSize * x + 0,
					y: panelSize * y - 60,
					src: scene.assets["map"],
					touchable: true
				});

				maps[y][x] = map;
				if (x > 0 && y > 0 && x < 5 && y < 5) {
					base.append(map);
				}

				//クリックイベント
				map.pointDown.add(() => {
					if (!scene.isStart) return;

					if (map.tag != undefined) {
						//減点
						/*
						scene.addScore(-100);
						const p = map.tag as Panel;
						p.frameNumber = 2;
						p.modified();
						scene.playSound("se_miss");
						*/
						return;
					}

					cursorArea.moveTo(map.x, map.y);
					cursorArea.show();
					cursorArea.modified();

					if (isStop) {
						//先行入力
						advancePos = { x: x, y: y }
					} else {
						move(map);
					}

				});

				map.pointUp.add(() => {
					if (isStop || !scene.isStart) return;
					if (map.tag != undefined) {
						const p = map.tag as Panel;
						p.frameNumber = 0;
						p.modified();
						return;
					}
				});
			}

		}

		base.append(cursorArea);//重ね順の関係でここでアペンド

		//枠
		const waku = new g.Sprite({
			scene: scene,
			src: scene.assets["waku"],
			x: 80 - 10,
			y: 20 - 10,
		});
		base.append(waku);

		//設置するパネル
		const panels: Panel[] = [];
		const panels_bk: Panel[] = [];
		for (let i = 0; i < 22; i++) {
			const panel = new Panel(scene, panelSize);
			panels_bk[i] = panel;
		}

		//影
		const shadow = new g.Sprite({
			scene: scene,
			src: scene.assets["panel"],
			width: panelSize,
			height: panelSize,
			srcX:panelSize,
			srcY: panelSize,
			opacity:0.1
		});

		//消したパネルの数
		const sprNum = new g.Sprite({
			scene: scene,
			src: scene.assets["combo"],
			width: 108,
			height: 40,
			srcY: 0,
			x: 560,
			y: 130,
		});
		this.append(sprNum);
		sprNum.hide();

		const labelNum = new g.Label({
			scene: scene,
			font: scene.numFontB,
			text: "0",
			fontSize: 40,
			x: -40
		});
		sprNum.append(labelNum);

		//連鎖数
		const sprCombo = new g.Sprite({
			scene: scene,
			src: scene.assets["combo"],
			width: 108,
			height: 40,
			srcY: 40,
			x: 560,
			y: 180
		});
		this.append(sprCombo);
		sprCombo.hide();

		const labelCombo = new g.Label({
			scene: scene,
			font: scene.numFontP,
			text: "0",
			fontSize: 40,
			x: -40
		});
		sprCombo.append(labelCombo);

		//詰み表示
		const sprMate = new g.Sprite({
			scene: scene,
			src: scene.assets["combo"],
			width: 108,
			height: 40,
			srcY: 80,
			x: 200,
			y: 130
		});
		this.append(sprMate);
		sprMate.hide();

		const labelMate = new g.Label({
			scene: scene,
			font: scene.numFontR,
			text: "-3000",
			fontSize: 32,
			x: -40,
			y: 50
		});
		sprMate.append(labelMate);


		this.finish = () => {
		};

		const start = () => {
			panels.length = 0;

			panels_bk.forEach((p) => {
				if (p.parent) p.remove();
				panels.push(p);
			});

			//盤面クリア
			for (let y = 1; y < maps.length - 1; y++) {
				for (let x = 1; x < maps[y].length - 1; x++) {
					maps[y][x].tag = undefined;
				}
			}

			nowPanelNum = 1;

			//キープクリア
			areas[0].tag = undefined;

			//手札の設定
			for (let i = 1; i < areas.length; i++) {
				const p = areas[i];
				const panel = panels.pop();
				panel.x = p.x;
				panel.y = p.y;
				panel.scale(p.scaleX);
				panel.setNum(arrNum[scene.random.get(0, arrNum.length - 1)]);
				panel.modified();
				base.append(panel);
				p.tag = panel;
			}

			advancePos = undefined;
			cursorArea.hide();

			if(shadow.parent)shadow.remove();

			isStop = false;
		}

		//リセット
		this.reset = () => {
			start();
		};

	}
}

//エフェクトクラス
class Effect extends g.E {
	public startEffect: (panel: Panel) => void;

	constructor(scene: g.Scene, panelSize: number) {
		super({
			scene: scene,
			width: panelSize,
			height: panelSize,
			angle: 15
		});
		const tl = require("@akashic-extension/akashic-timeline");
		const timeline = new tl.Timeline(scene);

		const effects: g.FilledRect[] = [];
		const size = panelSize / 2;
		for (let i = 0; i < 4; i++) {
			const effect = new g.FilledRect({
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
			this.append(effect);
		}

		//エフェクト表示
		const dx = [-1, 1, -1, 1];
		const dy = [-1, -1, 1, 1];
		this.startEffect = (panel: Panel) => {
			this.x = panel.x;
			this.y = panel.y;
			this.modified();

			for (let i = 0; i < 4; i++) {
				const effect = effects[i];
				effect.x = size * (i % 2);
				effect.y = size * (Math.floor(i / 2));
				effect.show();
				timeline.create(effect).wait(100).moveBy(dx[i] * size, dy[i] * size, 300).call(() => {
					effect.hide();
				});
			}
		}
	}
}

//パネルクラス
class Panel extends g.FrameSprite {
	public setNum: (num: number) => void;

	public num = 0;
	constructor(scene: MainScene, panelSize: number) {
		super({
			scene: scene,
			width: panelSize,
			height: panelSize,
			frames: [0, 1, 2],
			src: scene.assets["panel"] as g.ImageAsset
		});

		//数字ラベル
		const label = new g.Label({
			scene: scene,
			y: 20,
			font: scene.numFontK,
			fontSize: 38,
			textAlign: g.TextAlign.Center,
			widthAutoAdjust: false,
			width: panelSize - 2,
			text: "1"
		});
		this.append(label);

		//数字セット
		this.setNum = (num: number) => {
			if (num != 1) {
				this.frameNumber = 0;
				this.num = num;
				this.modified();
				label.text = "" + num;
				label.invalidate();
				this.show();//いまいち
			} else {
				this.hide();
			}
		}

	}
}
