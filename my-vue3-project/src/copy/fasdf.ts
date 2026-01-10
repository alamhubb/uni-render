import { createHotContext as __vite__createHotContext } from "/@vite/client";
import.meta.hot = __vite__createHotContext("/src/pages/index/index.vue");
import { defineComponent as _defineComponent } from "/node_modules/uniapp-render/src/index.ts?v=c8008cc5";
import { createElementVNode as _createElementVNode, createCommentVNode as _createCommentVNode, openBlock as _openBlock2Render, createElementBlock as _createElementBlock2Render } from "/node_modules/uniapp-render/src/index.ts?v=c8008cc5";
const __sfc__ = _defineComponent({
    setup(__props, { expose: __expose }) {
        __expose();
        const __returned__ = {};
        Object.defineProperty(__returned__, "__isScriptSetup", {
            enumerable: false,
            value: true
        });
        return __returned__;
    }
});
const _hoisted_1 = /* @__PURE__ */
    _createElementVNode("div", null, [/* @__PURE__ */
        _createElementVNode("a", {
            href: "https://vite.dev",
            target: "_blank"
        }, [/* @__PURE__ */
            _createElementVNode("img", {
                src: "/static/vite.svg",
                class: "logo",
                alt: "Vite logo"
            })]), /* @__PURE__ */
        _createElementVNode("a", {
            href: "https://vuejs.org/",
            target: "_blank"
        }, [/* @__PURE__ */
            _createElementVNode("img", {
                src: "/static/vue.svg",
                class: "logo vue",
                alt: "Vue logo"
            })])], -1 /* HOISTED */
    );
function render(_ctx, _cache) {
    return _openBlock2Render(),
        _createElementBlock2Render("div", null, [_hoisted_1, _createCommentVNode(' <HelloWorld msg="Vite + Vue" /> ')]);
}
__sfc__.render = render;
const _sfc_main = __sfc__;
import "/src/pages/index/index.vue?vue&type=style&index=0&scoped=83a5a03c&lang.css";
_sfc_main.__hmrId = "83a5a03c";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.on("file-changed", ({ file }) => {
    __VUE_HMR_RUNTIME__.CHANGED_FILE = file;
}
);
import.meta.hot.accept((mod) => {
    if (!mod)
        return;
    const { default: updated, _rerender_only } = mod;
    if (_rerender_only) {
        __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
    } else {
        __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
    }
}
);
import _export_sfc from "/@id/__x00__plugin-vue:export-helper";
export default /* @__PURE__ */
    _export_sfc(_sfc_main, [["__scopeId", "data-v-83a5a03c"], ["__file", "D:/project/parserall/uniapp-render/my-vue3-project/src/pages/index/index.vue"]]);
