<template>
  <div>
    <div :style="{ marginTop: '2em', textAlign: 'center' }">
      <p :style="{ color: '#42b883', fontSize: '2em' }">Hello uni-render</p>
    </div>

    <h1 :style="{ fontSize: '2em', color: '#333', lineHeight: '1.1', fontWeight: 'bold', marginTop: '1em' }">
      {{ msg }}
    </h1>

    <div class="card">
      <button type="button" @click="count++">count is {{ count }}</button>
      <p :style="{ marginTop: '1em' }">
        Edit <code>components/HelloWorldTemplate.vue</code> to test HMR
      </p>
    </div>

    <p :style="{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: '1em' }">
      Github:
      <a
          :style="{ fontWeight: 500, color: '#646cff', marginLeft: '0.3em', textDecoration: 'inherit' }"
          href="https://github.com/alamhubb/uni-render"
          target="_blank"
      >
        https://github.com/alamhubb/uni-render
      </a>
    </p>
  </div>
</template>

<script lang="ts">
import {ref, defineComponent} from 'vue'

export default defineComponent({
  props: {
    msg: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const count = ref(0)
    return {count}
  }
})
</script>

<style scoped>
.read-the-docs {
  color: #888;
  margin-top: 1em;
}
</style>
