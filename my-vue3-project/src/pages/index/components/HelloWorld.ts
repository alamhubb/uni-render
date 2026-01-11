import { ref, h, defineComponent } from '@/unirender'

export default defineComponent({
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const count = ref(0)

        console.log('[HelloWorld] setup 执行，初始 count:', count.value)

        // setup 返回渲染函数
        return () => {
            console.log('[HelloWorld] render 执行，count:', count.value)
            return h('view', { class: 'hello-world' }, [
                h('text', { class: 'title' }, props.msg),
                h('view', { class: 'card' }, [
                    h('button', {
                        onClick: () => {
                            count.value++
                            console.log('[HelloWorld] 点击按钮，count 变为:', count.value)
                        }
                    }, `count is ${count.value}`),
                    h('text', {}, ' Edit components/HelloWorld.ts to test HMR')
                ]),
                h('text', { class: 'read-the-docs' }, 'Click on the Vite and Vue logos to learn more')
            ])
        }
    }
})
