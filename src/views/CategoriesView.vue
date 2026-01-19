<template>
  <div class="categories-page">
    <div class="page-header">
      <h2>Quản lý danh mục</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>
        Thêm danh mục
      </el-button>
    </div>

    <div class="data-table">
      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="name" label="Tên danh mục" min-width="200" />

        <el-table-column label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.is_public ? 'success' : 'info'">
              {{ row.is_public ? 'Công khai' : 'Ẩn' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Ngày tạo" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchCategories"
          @current-change="fetchCategories"
        />
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'"
      width="450px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="Tên" prop="name">
          <el-input v-model="form.name" placeholder="Nhập tên danh mục" />
        </el-form-item>

        <el-form-item label="Công khai">
          <el-switch v-model="form.is_public" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? 'Cập nhật' : 'Thêm' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const categories = ref([])
const editingId = ref(null)

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  name: '',
  is_public: true
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên danh mục', trigger: 'blur' }]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openDialog(category = null) {
  if (category) {
    isEdit.value = true
    editingId.value = category.id
    form.name = category.name
    form.is_public = category.is_public
  } else {
    isEdit.value = false
    editingId.value = null
    form.name = ''
    form.is_public = true
  }
  dialogVisible.value = true
}

async function fetchCategories() {
  loading.value = true
  try {
    const response = await api.get('/categories', {
      params: {
        page: pagination.page,
        limit: pagination.limit
      }
    })
    if (response.data.success) {
      const data = response.data.data
      // Hỗ trợ cả trường hợp API trả về mảng hoặc object có pagination
      if (Array.isArray(data)) {
        categories.value = data
        pagination.total = data.length
      } else {
        categories.value = data.categories || data || []
        pagination.total = data.pagination?.totalItems || data.total || categories.value.length
      }
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách danh mục')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true

    try {
      let response
      if (isEdit.value) {
        response = await api.put(`/category/${editingId.value}`, form)
      } else {
        // Backend yêu cầu field category_name
        response = await api.post('/category', {
          category_name: form.name,
          is_public: form.is_public
        })
      }

      if (response.data.success) {
        ElMessage.success(isEdit.value ? 'Cập nhật thành công' : 'Thêm danh mục thành công')
        dialogVisible.value = false
        fetchCategories()
      } else {
        ElMessage.error(response.data.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(category) {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa danh mục "${category.name}"?`,
      'Xác nhận xóa',
      {
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        type: 'warning'
      }
    )

    const response = await api.delete(`/categories/${category.id}`)
    if (response.data.success) {
      ElMessage.success('Xóa danh mục thành công')
      fetchCategories()
    } else {
      ElMessage.error(response.data.message || 'Xóa thất bại')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Lỗi khi xóa danh mục')
    }
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
