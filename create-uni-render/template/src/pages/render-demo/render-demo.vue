<script lang="ts">
import { ref, h, defineComponent } from 'vue'

export default defineComponent({
    setup() {
        const count = ref(0)
        const items = ref(['项目 1', '项目 2'])

        const addItem = () => {
            items.value.push(`项目 ${items.value.length + 1}`)
        }

        // 返回渲染函数
        return () => h('view', { class: 'container' }, [
            h('text', { class: 'title' }, '🎯 渲染函数示例'),
            h('text', { class: 'subtitle' }, '使用 h() 函数构建 UI'),
            
            // 计数器
            h('view', { class: 'counter' }, [
                h('text', {}, `计数: ${count.value}`),
                h('button', { 
                    class: 'btn',
                    onClick: () => count.value++ 
                }, '+1')
            ]),

            // 列表
            h('view', { class: 'list' }, 
                items.value.map((item, i) => 
                    h('text', { key: i, class: 'list-item' }, item)
                )
            ),
            h('button', { class: 'btn', onClick: addItem }, '添加项目')
        ])
    }
})
</script>

<style>
.container {
    display: flex;
    flex-direction: column;
    padding: 20px;
}
.title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}
.subtitle {
    color: #666;
    margin-bottom: 20px;
}
.counter {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}
.btn {
    padding: 8px 16px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 4px;
}
.list {
    margin-bottom: 20px;
}
.list-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
}
</style>
