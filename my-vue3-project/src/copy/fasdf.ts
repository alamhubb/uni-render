import "/@id/__x00__unirender-css:D:/project/parserall/uniapp-render/my-vue3-project/src/pages/index/components/HelloWorld.vue.css";
import {defineComponent, ref} from "/src/unirender/index.ts";
import {
    toDisplayString as _toDisplayString,
    createElementVNode as _createElementVNode,
    createTextVNode as _createTextVNode,
    Fragment as _Fragment,
    openBlock as _openBlock2Render,
    createElementBlock as _createElementBlock2Render
} from "/src/unirender/index.ts";

const __sfc__ = defineComponent({
    name: "HelloWorld",
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const count = ref(0);
        return {
            count
        };
    }
});

function render(_ctx, _cache) {
    return _openBlock2Render(), _createElementBlock2Render(
        _Fragment,
        null,
        [
            _createElementVNode(
                "h1",
                null,
                _toDisplayString(_ctx.msg),
                1
                /* TEXT */
            ),
            _createElementVNode("div", {class: "card"}, [
                _createElementVNode(
                    "button",
                    {
                        type: "button",
                        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.count++)
                    },
                    "count is " + _toDisplayString(_ctx.count),
                    1
                    /* TEXT */
                ),
                _createElementVNode("p", null, [
                    _createTextVNode(" Edit "),
                    _createElementVNode("code", null, "components/HelloWorld.vue"),
                    _createTextVNode(" to test HMR ")
                ])
            ]),
            _createElementVNode("p", null, [
                _createTextVNode(" Check out "),
                _createElementVNode("a", {
                    href: "https://vuejs.org/guide/quick-start.html#local",
                    target: "_blank"
                }, "create-vue"),
                _createTextVNode(", the official Vue + Vite starter ")
            ]),
            _createElementVNode("p", null, [
                _createTextVNode(" Learn more about IDE Support for Vue in the "),
                _createElementVNode("a", {
                    href: "https://vuejs.org/guide/scaling-up/tooling.html#ide-support",
                    target: "_blank"
                }, "Vue Docs Scaling up Guide"),
                _createTextVNode(". ")
            ]),
            _createElementVNode("p", {class: "read-the-docs"}, "Click on the Vite and Vue logos to learn more")
        ],
        64
        /* STABLE_FRAGMENT */
    );
}

__sfc__.render = render;
export default __sfc__;
