/*
 * @Author: xxZhang
 * @Date: 2019-08-27 11:40:06
 * @Description: 
 */

const List = require('List');

cc.Class({
    extends: cc.Component,

    properties: {
        //网格列表
        listG: List,
        info: {
            default: null,
            type: cc.Label
        },
        input: {
            default: null,
            type: cc.EditBox
        }
    },

    onLoad: function () {
        this.data = [
            ["ABC",
                "A", "B", "C", "D",
                "E", "F", "G", "H",
                "I", "J", "K", "L",
                "M", "N", "O", "P",
                "Q", "R", "S", "T",
                "U", "V", "W", "X",
                "Y", "Z"
            ], 
            ["abc",
                "a", "b", "c", "d",
                "e", "f", "g", "h",
                "i", "g", "k", "l",
                "m", "n", "o", "p",
                "q", "r", "s", "t",
                "u", "v", "w", "x",
                "y", "z"
            ],
            ["一", "一", "一", "丨", "丿", 
                    "乛", "亅", "乙", "乚",
                    "丶"],
            ["二", "八", "勹", "匕", "十",
                    "卜", "厂", "刀", "又",
                    "儿", "二", "匚",  "几"],
            ["三", "寸", "大", "飞", "干",
                    "工", "弓", "广", "己",
                    "口", "马", "门", "女",
                    "山", "尸", "士", "巳",
                    "土", "囗", "兀", "夕",
                    "小", "幺", "弋", "尢", 
                    "子"]
        ];
        // this.listG.colLineNum = 3;

        this.listG.elementList = this.data;

        // this.scheduleOnce(() => {
        //     this.listG.scrollTo(parseInt(this.input.string), .1);
        // }, 0.1);
    },
    
    //网格列表渲染器
    onListGridRender(item, idx) {
        item.script.title.string = this.getValueById(idx);
        this.info.string = '当前渲染总数 = ' + this.listG.actualNumItems;
    },

    getValueById(INId) {
        for(let i = 0; i < this.data.length; ++ i) {
            if(INId > this.data[i].length - 1) {
                INId -= this.data[i].length;
                continue;
            }
            return this.data[i][INId];
        }
        return "";
    },
    
    //当列表项被选择...
    onListSelected(item, selectedId, lastSelectedId, val) {
        if (!item)
            return;
        let list = item.listItem._list;
        let str = '当前操作List为：' + list.node.name + '，当前选择的是：' + selectedId + '，上一次选择的是：' + lastSelectedId;
        if (list.selectedMode == 2) { //如果是多选模式
            str += '，当前值为：' + val;
        }
        console.log(str);
    },
    //按钮事件
    btnEvent(ev) {
        let name = ev.target.name;
        let t = this;
        let callFunc = function (idx) {
            if (idx != null) {
                t.data.splice(idx, 1);
                console.log('------删除完毕！', idx);
                t.listV.numItems = t.data.length;
                t.listH.numItems = t.data.length;
                t.listG.numItems = t.data.length;
                t.listG2.numItems = t.data.length;
            }
        }
        switch (name) {
            case 'btn1':
                t.listV.aniDelItem(1, callFunc, 3);
                break;
            case 'btn2':
                t.listH.aniDelItem(t.listH.selectedId, callFunc, 0);
                break;
            case 'btn3':
                t.listG.aniDelItem(1, callFunc);
                break;
            case 'btn4':
                //key=Id，val=Size
                let heightData = {
                    0: 300,
                    5: 260,
                    6: 300,
                    10: 210,
                    13: 100,
                    14: 130,
                    15: 160,
                    17: 1000,
                };
                t.listV.customSize = heightData;
                //设置了customSize后，要刷新（也就是重新设置numItems）
                t.listV.numItems = t.data.length;
                break;
            case 'btn5':
                //key=Id，val=Size
                let widthData = {
                    0: 400,
                    5: 260,
                    6: 300,
                    10: 210,
                    13: 100,
                    14: 130,
                    15: 160,
                };
                t.listH.customSize = widthData;
                //设置了customSize后，要刷新（也就是重新设置numItems）
                t.listH.numItems = t.data.length;
                break;
            case 'btn6':
                this.skipToValue();
                break;
        }
    },

    skipToValue() {
        let curValue = this.input.string;
        let totalIndex = 0;
        for(let i = 0; i < this.data.length; ++ i) {
            let curDimensionList = this.data[i];
            for(let j = 1; j < curDimensionList.length; ++ j) {
                if(curValue === curDimensionList[j]) {
                    this.listG.scrollTo(totalIndex, .1);
                    break;
                }
                totalIndex += 1;
            }
        }
        
    }

});