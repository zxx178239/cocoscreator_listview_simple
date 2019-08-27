/*
 * @Author: xxZhang
 * @Date: 2019-08-25 03:33:20
 * @Description: 简化版动态更新的list
 */


const TemplateType = cc.Enum({
    'NODE': 1,
    'PREFAB': 2,
});
const SlideType = cc.Enum({
    'NORMAL': 1, //普通
    'ADHERING': 2, //粘附效果，没有滚动惯性
    'PAGE': 3,   //页面
});
const SelectedType = cc.Enum({
    'NONE': 0,
    'SINGLE': 1, //单选
    'MULT': 2, //多选
});

const ListItem = require('ListItem');

cc.Class({
    extends: cc.Component,

    editor: {
        disallowMultiple: false,
        menu: '自定义组件/List',
        //脚本生命周期回调的执行优先级。小于 0 的脚本将优先执行，大于 0 的脚本将最后执行。该优先级只对 onLoad, onEnable, start, update 和 lateUpdate 有效，对 onDisable 和 onDestroy 无效。
        executionOrder: -5000,
    },

    properties: {
        _isHasTitle: true,
        isHasTitle: {
            tooltip: CC_DEV && '确定是否有title节点',
            get() {
                return this._isHasTitle;
            },
            set(val) {
                if (val != null)
                    this._isHasTitle = val;
            }
        },

        titlePrefab: {
            default: null,
            type: cc.Prefab,
            tooltip: CC_DEV && '标题节点prefab，type:cc.Prefab',
            visible: function () {
                return this._isHasTitle;
            }
        },

        subPrefab: {
            default: null,
            type: cc.Prefab,
            tooltip: CC_DEV && '子节点prefab，type:cc.Prefab',
        },

        _updateRate: 2,
        updateRate: {
            type: cc.Integer,
            range: [0, 6, 1],
            tooltip: CC_DEV && '刷新频率（值越大刷新频率越低、性能越高）',
            slide: true,
            get() {
                return this._updateRate;
            },
            set(val) {
                if (val >= 0 && val <= 6) {
                    this._updateRate = val;
                }
            }
        },
        frameByFrameRenderNum: {
            default: 0,
            type: cc.Integer,
            range: [0, 12, 1],
            tooltip: CC_DEV && '逐帧渲染时，每帧渲染的Item数量（<=0时关闭分帧渲染）',
            slide: true,
        },
        renderEvent: {
            default: null,
            type: cc.Component.EventHandler,
            tooltip: CC_DEV && '渲染事件（渲染器）',
        },
        _colLineNum: 1,
        colLineNum: {
            get: function () {
                return this._colLineNum;
            },
            set: function (val) {
                this._colLineNum = val;
            }
        },

        _numTitleItems: {
            default: 0,
            serializable: false,
        },

        numTitleItems: {
            visible: false,
            get() {
                return this._numTitleItems;
            },
            set(val) {
                let t = this;
                if (!t.checkInited())
                    return;
                if (val == null || val < 0) {
                    cc.error("num title items set error ", val);
                    return;
                }
                t._numTitleItems = val;
            }
        },

        _numSubItems: {
            default: 0,
            serializable: false,
        },
        numSubItems: {
            visible: false,
            get() {
                return this._numSubItems;
            },
            set(val) {
                let t = this;
                if (!t.checkInited())
                    return;
                if (val == null || val < 0) {
                    cc.error('numItems set the wrong::', val);
                    return;
                }
                t._numSubItems = val;
                t._forceUpdate = true;

                t._resizeContent();
                t._onScrolling();
            }
        },


    },

    onLoad() {
        this._init();
    },

    onEnable() {
        if (!CC_EDITOR) {
            this._registerEvent();
        }
        this._init();
    },

    onDisable() {
        if (!CC_EDITOR) {
            this._unregisterEvent();
        }
    },
    //注册事件
    _registerEvent() {
        let t = this;
        t.node.on('touch-up', t._onScrollTouchUp, t, true);
        // t.node.on(cc.Node.EventType.TOUCH_CANCEL, t._onScrollTouchUp, t);
        // t.node.on(cc.Node.EventType.TOUCH_MOVE, t._onScrollTouchMove, t);
        t.node.on('scroll-began', t._onScrollBegan, t, true);
        t.node.on('scroll-ended', t._onScrollEnded, t, true);
        t.node.on('scrolling', t._onScrolling, t, true);
    },
    //卸载事件
    _unregisterEvent() {
        let t = this;
        t.node.off('touch-up', t._onScrollTouchUp, t, true);
        // t.node.off(cc.Node.EventType.TOUCH_CANCEL, t._onScrollTouchUp, t);
        // t.node.off(cc.Node.EventType.TOUCH_MOVE, t._onScrollTouchMove, t);
        t.node.off('scroll-began', t._onScrollBegan, t, true);
        t.node.off('scroll-ended', t._onScrollEnded, t, true);
        t.node.off('scrolling', t._onScrolling, t, true);
    },
    //初始化各种..
    _init() {
        let t = this;
        if (t._inited)
            return;

        t._scrollView = t.node.getComponent(cc.ScrollView);
        if (!t._scrollView) {
            cc.error(t.node.name + ' no assembly cc.ScrollView!');
            return;
        }
        t.content = t._scrollView.content;
        if (!t.content) {
            cc.error(t.node.name + "'s cc.ScrollView unset content!");
            return;
        }

        t.initContentAnchor = t.content.getAnchorPoint();

        t._layout = t.content.getComponent(cc.Layout);

        t._resizeMode = t._layout.resizeMode; //自适应模式

        t._topGap = t._layout.paddingTop;       //顶边距
        t._rightGap = t._layout.paddingRight;   //右边距
        t._bottomGap = t._layout.paddingBottom; //底边距
        t._leftGap = t._layout.paddingLeft;     //左边距

        t._columnGap = t._layout.spacingX;      //列距
        t._lineGap = t._layout.spacingY;        //行距

        t.setTemplateItem(t.subPrefab.data);

        t._lastDisplayData = [];//最后一次刷新的数据
        t.displayData = [];     //当前数据
        t._subNodePool = new cc.NodePool();    //这是个子节点池子
        t._titleNodePool = new cc.NodePool();    // 标题节点池子
        t._forceUpdate = false; //是否强制更新
        t._updateCounter = 0;   //当前分帧渲染帧数
        t._updateDone = true;   //分帧渲染是否完成

        t.curPageNum = 0;   //当前页数

        t.content.removeAllChildren();
        t._inited = true;
    },

    //设置模板Item
    setTemplateItem(item) {
        if (!item)
            return;
        let t = this;
        t._itemTmp = item;
        if (t._resizeMode == cc.Layout.ResizeMode.CHILDREN)
            t._itemSize = t._layout.cellSize;
        else
            t._itemSize = new cc.size(t._itemTmp.width, t._itemTmp.height);
    },

    /**
     * 检查是否初始化
     * @param {Boolean} printLog 是否打印错误信息
     * @returns
     */
    checkInited(printLog) {
        let pL = printLog ? printLog : true;
        if (!this._inited) {
            if (pL) {
                cc.error('List initialization not completed!');
            }
            return false;
        }
        return true;
    },

    //禁用 Layout 组件，自行计算 Content Size
    _resizeContent() {
        let t = this;
        let result;
        let lineNum = Math.ceil(t._numSubItems / t._colLineNum);
        result = t.content.height = t._topGap + (t._itemSize.height * lineNum)
            + (t._lineGap * (lineNum - 1)) + t._bottomGap;

        let layout = t.content.getComponent(cc.Layout);
        if (layout)
            layout.enabled = false;

        t._allItemSize = result;

        let targetWH;
        targetWH = result < t.node.height ? (t.node.height - .1) : result;
        if (targetWH < 0)
            targetWH = 0;
        t._lackSize = t.lackCenter ? targetWH : null;
        t._allItemSizeNoBorder = t._allItemSize - t._topGap - t._bottomGap;
        t.content.height = targetWH;
    },

    //滚动进行时...
    _onScrolling(ev) {
        if (this.frameCount == null)
            this.frameCount = this._updateRate;
        if (!this._forceUpdate && (ev && ev.type != 'scroll-ended') && this.frameCount > 0) {
            this.frameCount--;
            return;
        } else
            this.frameCount = this._updateRate;

        if (this._aniDelRuning)
            return;

        this._calcViewPos();

        this.displayData = [];

        let curId = 0;
        let endId = this._numSubItems - 1;

        let hh = this._itemSize.height + this._lineGap;
        curId = Math.floor((-this.viewTop - this._topGap) / hh) * this._colLineNum;
        endId = Math.ceil((-this.viewBottom - this._bottomGap) / hh) * this._colLineNum;
        endId --;
        if (curId < 0)
            curId = 0;
        if (endId >= this._numSubItems)
            endId = this._numSubItems - 1;
        cc.log(curId, endId);
        for (; curId <= endId; curId++) {
            this.displayData.push(this._calcItemPos(curId));
        }
        // console.log("this.displayData: ", this.displayData);
        if (this.displayData.length <= 0 || !this._numSubItems) { //if none, delete all.
            this._delRedundantItem();
            return;
        }
        this.firstListId = this.displayData[0].id;
        this.actualNumItems = this.displayData.length;
        let len = this._lastDisplayData.length;
        //判断数据是否与当前相同，如果相同，return。
        if (this._forceUpdate ||
            this.actualNumItems != len ||
            this.firstListId != this._lastDisplayData[0] ||
            this.displayData[this.actualNumItems - 1].id != this._lastDisplayData[len - 1]
        ) {
            this._lastDisplayData = [];
            if (this.frameByFrameRenderNum > 0) { //逐帧渲染
                if (this._numSubItems > 0) {
                    if (!this._updateDone) {
                        this._doneAfterUpdate = true;
                    } else {
                        this._updateCounter = 0;
                    }
                    this._updateDone = false;
                } else {
                    this._delRedundantItem();
                    this._updateCounter = 0;
                    this._updateDone = true;
                }
            } else { //直接渲染
                for (let c = 0; c < this.actualNumItems; c++) {
                    this._createOrUpdateItem(this.displayData[c]);
                }
                this._delRedundantItem();
                this._forceUpdate = false;
            }
        }
        this._calcNearestItem();
    },

    //计算可视范围
    _calcViewPos() {
        let scrollPos = this.content.getPosition();
        this.elasticTop = scrollPos.y < 0 ? Math.abs(scrollPos.y) : 0;
        this.viewTop = (scrollPos.y > 0 ? -scrollPos.y : 0) + this.elasticTop;
        this.viewBottom = this.viewTop - this.node.height;
        this.elasticBottom = this.viewBottom < -this.content.height ? Math.abs(this.viewBottom + this.content.height) : 0;
        this.viewBottom += this.elasticBottom;

    },
    //计算位置 根据id
    _calcItemPos(id) {
        let top, bottom, itemX, itemY;
        let colLine = Math.floor(id / this._colLineNum);
        top = -this._topGap - ((this._itemSize.height + this._lineGap) * colLine);
        bottom = top - this._itemSize.height;
        itemY = bottom + (this._itemTmp.anchorY * this._itemSize.height);

        itemX = this._leftGap + ((id % this._colLineNum) * (this._itemSize.width + this._columnGap))
            + this._itemSize.width / 2;

        return {
            id: id,
            top: top,
            bottom: bottom,
            x: itemX,
            y: itemY,
        };

    },

    //滚动开始时..
    _onScrollBegan() {
        this._beganPos = this.viewTop;
    },
    //滚动结束时..
    _onScrollEnded() {
        let t = this;
        if (t.scrollToListId != null) {
            let item = t.getItemByListId(t.scrollToListId);
            t.scrollToListId = null;
            if (item) {
                item.runAction(new cc.sequence(
                    new cc.scaleTo(.1, 1.06),
                    new cc.scaleTo(.1, 1),
                    //new cc.callFunc(function (runNode) {

                    // })
                ));
            }
        }
        t._onScrolling();

    },
    //触摸抬起时..
    _onScrollTouchUp() {
        console.log("on scroll touch up");
        let t = this;
        t._scrollPos = null;
    },

    //Update..
    update() {
        if (this.frameByFrameRenderNum <= 0 || this._updateDone)
            return;

        let len = (this._updateCounter + this.frameByFrameRenderNum) > this.actualNumItems ? this.actualNumItems : (this._updateCounter + this.frameByFrameRenderNum);
        for (let n = this._updateCounter; n < len; n++) {
            let data = this.displayData[n];
            if (data)
                this._createOrUpdateItem(data);
        }

        if (this._updateCounter >= this.actualNumItems - 1) { //最后一个
            if (this._doneAfterUpdate) {
                this._updateCounter = 0;
                this._updateDone = false;
                if (!this._scrollView.isScrolling())
                    this._doneAfterUpdate = false;
            } else {
                this._updateDone = true;
                this._delRedundantItem();
                this._forceUpdate = false;
                this._calcNearestItem();
            }
        } else {
            this._updateCounter += this.frameByFrameRenderNum;
        }

    },
    /**
     * 创建或更新Item（虚拟列表用）
     * @param {Object} data 数据
     */
    _createOrUpdateItem(data) {
        let item = this.getItemByListId(data.id);
        if (!item) { //如果不存在
            if (this._subNodePool.size()) {
                item = this._subNodePool.get();
                // cc.log('从池中取出::   旧id =', item._listId, '，新id =', data.id, item);
            } else {
                item = cc.instantiate(this._itemTmp);
                // cc.log('新建::', data.id, item);
            }
            item._listId = data.id;
            item.setPosition(new cc.v2(data.x, data.y));
            this._resetItemSize(item);
            this.content.addChild(item);
            item.setSiblingIndex(this.content.childrenCount - 1);
            let listItem = item.getComponent(ListItem);
            item.listItem = listItem;
            if (listItem) {
                listItem._list = this;
                listItem._registerEvent();
            }
            if (this.renderEvent) {
                cc.Component.EventHandler.emitEvents([this.renderEvent], item, data.id);
            }
        } else if (this._forceUpdate && this.renderEvent) { //强制更新
            item.setPosition(new cc.v2(data.x, data.y));
            this._resetItemSize(item);
            // cc.log('ADD::', data.id, item);
            if (this.renderEvent) {
                cc.Component.EventHandler.emitEvents([this.renderEvent], item, data.id);
            }
        }
        this._resetItemSize(item);

        this._updateListItem(item.listItem);
        if (this._lastDisplayData.indexOf(data.id) < 0) {
            this._lastDisplayData.push(data.id);
        }
    },

    _updateListItem(listItem) {
        if (!listItem)
            return;
        if (this.selectedMode > SelectedType.NONE) {
            switch (this.selectedMode) {
                case SelectedType.SINGLE:
                    listItem.selected = this.selectedId == listItem.node._listId;
                    break;
                case SelectedType.MULT:
                    listItem.selected = this.multSelected.indexOf(listItem.node._listId) >= 0;
                    break;
            }
        }
    },

    //仅虚拟列表用
    _resetItemSize(item) {
        item.setContentSize(this._itemSize);
    },

    /**
     * 设置多选
     * @param {Array} args 可以是单个listId，也可是个listId数组
     * @param {Boolean} bool 值，如果为null的话，则直接用args覆盖
     */
    setMultSelected(args, bool) {
        let t = this;
        if (!Array.isArray(args)) {
            args = [args];
        }
        if (bool == null) {
            t.multSelected = null;
            t.multSelected = args;
        } else {
            let listId, sub;
            if (bool) {
                for (let n = args.length - 1; n >= 0; n--) {
                    listId = args[n];
                    sub = t.multSelected.indexOf(listId);
                    if (sub < 0) {
                        t.multSelected.push(listId);
                    }
                }
            } else {
                for (let n = args.length - 1; n >= 0; n--) {
                    listId = args[n];
                    sub = t.multSelected.indexOf(listId);
                    if (sub >= 0) {
                        t.multSelected.splice(sub, 1);
                    }
                }
            }
        }
        t._forceUpdate = true;
        t._onScrolling();
    },

    /**
     * 更新指定的Item
     * @param {Array} args 单个listId，或者数组
     * @returns
     */
    updateAppointed(args) {
        if (!Array.isArray(args)) {
            args = [args];
        }
        let len = args.length;
        for (let n = 0; n < len; n++) {
            let listId = args[n];
            let item = this.getItemByListId(listId);
            if (item) {
                cc.Component.EventHandler.emitEvents([this.renderEvent], item, listId);
            }
        }
    },
    /**
     * 根据ListID获取Item
     * @param {Number} listId
     * @returns
     */
    getItemByListId(listId) {
        for (let n = this.content.childrenCount - 1; n >= 0; n--) {
            if (this.content.children[n]._listId == listId)
                return this.content.children[n];
        }
        return null;
    },
    /**
     * 获取在显示区域外的Item
     * @returns
     */
    _getOutsideItem() {
        let item, isOutside;
        let result = [];
        for (let n = this.content.childrenCount - 1; n >= 0; n--) {
            item = this.content.children[n];
            isOutside = true;
            if (isOutside) {
                for (let c = this.actualNumItems - 1; c >= 0; c--) {
                    if (!this.displayData[c])
                        continue;
                    let listId = this.displayData[c].id;
                    if (item._listId == listId) {
                        isOutside = false;
                        break;
                    }
                }
            }
            if (isOutside) {
                result.push(item);
            }
        }
        return result;
    },

    //删除显示区域以外的Item
    _delRedundantItem() {
        let arr = this._getOutsideItem();
        for (let n = arr.length - 1; n >= 0; n--) {
            this._subNodePool.put(arr[n]);
        }
    },

    /**
     * 滚动到..
     * @param {Number} listId 索引（如果<0，则滚到首个Item位置，如果>=_numSubItems，则滚到最末Item位置）
     * @param {Number} timeInSecond 时间
     * @param {Number} offset 索引目标位置偏移，0-1
     * @param {Boolean} overStress 滚动后是否强调该Item（这只是个实验功能）
     */
    scrollTo(listId, timeInSecond, offset, overStress) {
        let t = this;
        if (!t.checkInited())
            return;
        t._scrollView.stopAutoScroll();
        if (timeInSecond == null)   //默认0.5
            timeInSecond = .5;
        else if (timeInSecond < 0)
            timeInSecond = 0;
        if (listId < 0)
            listId = 0;
        else if (listId >= t._numSubItems)
            listId = t._numSubItems - 1;
        let pos = t._calcItemPos(listId); //嗯...不管virtual=true还是false，都自己算，反正结果都一样，懒得去遍历content.children了。
        let targetY;

        targetY = pos.top;
        if (offset != null)
            targetY += t.node.height * offset;
        else
            targetY += t._topGap;
        pos = new cc.v2(0, -targetY);

        let viewPos = t.content.getPosition();
        viewPos = Math.abs(viewPos.y);

        let comparePos = pos.y;
        let runScroll = Math.abs((t._scrollPos != null ? t._scrollPos : viewPos) - comparePos) > .5;
        // cc.log(runScroll, t._scrollPos, viewPos, comparePos)

        t._scrollView.stopAutoScroll();
        if (runScroll) {
            t._scrollPos = comparePos;
            t._scrollView.scrollToOffset(pos, timeInSecond);
            // cc.log(listId, t.content.width, t.content.getPosition(), pos);
            t.scheduleOnce(() => {
                if (!t._adheringBarrier) {
                    t.adhering = t._adheringBarrier = false;
                }
                t._scrollPos = null;
                //cc.log('2222222222', t._adheringBarrier)
                if (overStress) {
                    // t.scrollToListId = listId;
                    let item = t.getItemByListId(listId);
                    if (item) {
                        item.runAction(new cc.sequence(
                            new cc.scaleTo(.1, 1.05),
                            new cc.scaleTo(.1, 1),
                        ));
                    }
                }
            }, timeInSecond + .1);

            if (timeInSecond <= 0) {
                t._onScrolling();
            }
        }
    },

    /**
     * 计算当前滚动窗最近的Item
     */
    _calcNearestItem() {
        this.nearestListId = null;
        let data, center;

        this._calcViewPos();

        let breakFor = false;
        for (let n = 0; n < this.content.childrenCount && !breakFor; n += this._colLineNum) {
            data = this.displayData[n];
            center = (data.top + data.bottom) / 2;
            if (data.top >= this.viewBottom) {
                this.nearestListId = data.id;
                if (this.viewBottom > center)
                    this.nearestListId += this._colLineNum;
                breakFor = true;
            }
        }

        data = this.displayData[this.actualNumItems - 1];
        if (data && data.id == this._numSubItems - 1) {
            center = (data.top + data.bottom) / 2;
            if (this.viewTop > center)
                this.nearestListId = data.id;
        }
    },
});