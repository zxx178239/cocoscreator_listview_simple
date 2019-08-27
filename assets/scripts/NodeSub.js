/*
 * @Author: xxZhang
 * @Date: 2019-08-25 03:33:20
 * @Description: 测试的item
 */


cc.Class({
    editor: {
        disallowMultiple: false,
        menu: '自定义组件/List Item',
        executionOrder: -5001,  //先于List
    },

    extends: Script,

    properties: {
        title: cc.Node,
    },

    onLoad() {
        //强行把文字组件转换给title...方便使用
        if (this.title) {
            let com = this.title.getComponent(cc.Label);
            if (!com)
                com = this.title.getComponent(cc.RichText);
            this.title = com;
        }
        //获取按钮组件，没有的话，selectedFlag无效
        this._btnCom = this.node.getComponent(cc.Button);
        if (!this._btnCom)
            this.selectedMode == SelectedType.NONE;
    },

    _registerEvent() {
        if (this._btnCom) {
            let eh = new cc.Component.EventHandler();
            eh.target = this.node;
            eh.component = 'NodeSub';
            eh.handler = 'onClickThis';
            this._btnCom.clickEvents.unshift(eh);
            this.eventReg = true;
        }
    },

    onClickThis() {
        // if (this._list.selectedMode == 1)
        // this._list.selectedId = this.node._listId;
    },

});