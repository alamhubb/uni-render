<script lang="ts">
import {defineComponent, h} from 'uni-render'
import HelloWorld from './components/HelloWorld.vue'

export default defineComponent({
  setup() {
    return () => h('div', {}, [
      h('div', {
        style: 'display: flex;flex-direction: row;justify-content: center'
      }, [
        h('a', {
          href: 'https://uniapp.dcloud.net.cn/',
          target: '_blank'
        }, [
          h('img', {
            src: '/static/logo.png',
            class: 'logo',
            alt: 'Uniapp logo'
          })
        ]),
        h('a', {
          href: 'https://github.com/alamhubb/uni-render',
          target: '_blank'
        }, [
          h('img', {
            src: '/static/renderlogo.png',
            class: 'render logo',
            alt: 'UniRender logo'
          })
        ])
      ]),
      h(HelloWorld, {msg: 'Uniapp + Render'})
    ])
  }
})
</script>
<style>
.logo {
  height: 6em;
  width: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.render:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>