<script lang="ts">
import { ref, h, defineComponent } from 'vue'

export default defineComponent({
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const count = ref(0)

        return () => h('view', { class: 'hello' }, [
            // 标题
            h('text', { class: 'title' }, props.msg),

            // 计数器卡片
            h('view', { class: 'card' }, [
                h('button', {
                    class: 'btn',
                    onClick: () => count.value++
                }, `count is ${count.value}`)
            ])
        ])
    }
})
</script>

<style scoped>
.hello {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.title {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin-bottom: 20px;
}

.card {
    padding: 20px;
}

.btn {
    padding: 12px 24px;
    font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
}
</style>
