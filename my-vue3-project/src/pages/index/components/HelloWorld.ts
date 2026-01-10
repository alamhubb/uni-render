import { h, ref, defineComponent } from 'uniapp-render'

export default defineComponent({
    props: {
        msg: { type: String, required: true }
    },
    setup(props) {
        const count = ref(0)

        return () => h('view', {}, [
            // 标题
            h('text', { class: 'title' }, props.msg),

            // Card 区域
            h('view', { class: 'card' }, [
                h('button', {
                    onClick: () => count.value++
                }, `count is ${count.value}`),
                h('text', {}, [
                    'Edit ',
                    h('text', { class: 'code' }, 'components/HelloWorld.ts'),
                    ' to test HMR'
                ])
            ]),

            // 链接说明
            h('text', {}, [
                'Check out ',
                h('navigator', { url: 'https://vuejs.org/guide/quick-start.html#local' }, 'create-vue'),
                ', the official Vue + Vite starter'
            ]),
            h('text', {}, [
                'Learn more about IDE Support for Vue in the ',
                h('navigator', { url: 'https://vuejs.org/guide/scaling-up/tooling.html#ide-support' }, 'Vue Docs Scaling up Guide'),
                '.'
            ]),
            h('text', { class: 'read-the-docs' }, 'Click on the Vite and Vue logos to learn more')
        ])
    }
})
