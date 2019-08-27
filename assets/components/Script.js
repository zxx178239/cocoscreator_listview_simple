/*
 * @Author: xxZhang
 * @Date: 2019-08-27 17:02:56
 * @Description: Script脚本，用于节点直接访问绑定的脚本
 */
window.Script = cc.Class({
    extends: cc.Component
});

cc.js.get(cc.Node.prototype, 'script', function () {
    return this.getComponent(Script);
});