import { defineComponent, h, ref } from 'uniapp-render'
import './HelloWorld.css'

export default defineComponent({
    name: 'HelloWorld',
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const count = ref(0)

        return () => h('div', {}, [
            h('h1', {}, props.msg),

            h('div', { class: 'card' }, [
                h('button', {
                    type: 'button',
                    onClick: () => count.value++
                }, `count is ${count.value}`),
                h('p', {}, [
                    'Edit ',
                    h('code', {}, 'components/HelloWorld.vue'),
                    ' to test HMR'
                ])
            ]),

            h('p', {}, [
                'Check out ',
                h('a', { href: 'https://vuejs.org/guide/quick-start.html#local', target: '_blank' }, 'create-vue'),
                ', the official Vue + Vite starter'
            ]),

            h('p', {}, [
                'Learn more about IDE Support for Vue in the ',
                h('a', { href: 'https://vuejs.org/guide/scaling-up/tooling.html#ide-support', target: '_blank' }, 'Vue Docs Scaling up Guide'),
                '.'
            ]),

            h('p', { class: 'read-the-docs' }, 'Click on the Vite and Vue logos to learn more')
        ])
    }
})
