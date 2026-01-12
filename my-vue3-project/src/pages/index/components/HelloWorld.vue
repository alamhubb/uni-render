<script lang="ts">
import {ref, h, defineComponent} from 'uni-render'

export default defineComponent({
  props: {
    msg: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const count = ref(0)

    return () => h('div', {}, [
      h('h1', {
        style: 'font-size: 2em; color: #333;line-height: 1.1;font-weight: bold;'
      }, props.msg),

      h('div', {
        style: 'margin-top: 2em; text-align: center;'
      }, [
        h('p', {
          style: 'color: #42b883;font-size: 2em'
        }, 'Hello uni-render')
      ]),

      h('div', {class: 'card'}, [
        h('button', {
          type: 'button',
          onClick: () => count.value++
        }, `count is ${count.value}`),
        h('p', {
          style: 'margin-top:1em'
        }, [
          'Edit ',
          h('code', {}, 'components/HelloWorld.vue'),
          ' to test HMR'
        ])
      ]),

      h('p', {
        style: 'display: flex;flex-direction: row;justify-content: center;margin-top:1em'
      }, [
        'Check out ',
        h('a', {
          style: 'font-weight: 500;color: #646cff;margin-left:0.3em;text-decoration: inherit;',
          href: 'https://github.com/alamhubb/uni-render/tree/main/create-uni-render/template',
          target: '_blank'
        }, 'create-uni-render'),
        ', the official UniApp render function starter'
      ]),

      h('p', {
        style: 'display: flex;flex-direction: row;justify-content: center;margin-top:1em'
      }, [
        'Learn more about uni-render in the ',
        h('a', {
          style: 'font-weight: 500;color: #646cff;margin-left:0.3em;text-decoration: inherit;',
          href: 'https://github.com/alamhubb/uni-render',
          target: '_blank'
        }, 'uni-render Documentation'),
        '.'
      ]),

      h('p', {
        class: 'read-the-docs'
      }, 'Click on the UniApp and uni-render logos to learn more')
    ])
  }
})
</script>

<style scoped>
.read-the-docs {
  color: #888;
  margin-top: 1em;
}
</style>
