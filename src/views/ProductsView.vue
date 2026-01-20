<template>
  <div class="products-page">
    <div class="page-header">
      <h2>Quản lý sản phẩm</h2>
      <el-button type="primary" @click="$router.push('/products/create')">
        <el-icon><Plus /></el-icon>
        Thêm sản phẩm
      </el-button>
    </div>

    <!-- Filters -->
    <div class="filter-section">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-input
            v-model="filters.search"
            placeholder="Tìm kiếm theo tên..."
            prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6">
          <el-select v-model="filters.category" placeholder="Danh mục" clearable @change="fetchProducts">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-col>
        <el-col :xs="12" :sm="6" :md="4" :lg="4">
          <el-select v-model="filters.isPublic" placeholder="Trạng thái" clearable @change="fetchProducts">
            <el-option label="Công khai" :value="true" />
            <el-option label="Ẩn" :value="false" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <!-- Products Table -->
    <div class="data-table">
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column label="Hình ảnh" width="100">
          <template #default="{ row }">
            <img :src="row.img_preview" :alt="row.name" class="product-image" />
          </template>
        </el-table-column>

        <el-table-column prop="id" label="Mã SP" width="150" />

        <el-table-column prop="name" label="Tên sản phẩm" min-width="200" />

        <el-table-column label="Giá" width="150">
          <template #default="{ row }">
            {{ formatPrice(row.price) }}
          </template>
        </el-table-column>

        <el-table-column label="Đánh giá" width="100">
          <template #default="{ row }">
            <el-rate v-model="row.rate" disabled show-score text-color="#ff9900" />
          </template>
        </el-table-column>

        <el-table-column label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.is_public ? 'success' : 'info'">
              {{ row.is_public ? 'Công khai' : 'Ẩn' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/products/${row.id}/edit`)">
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
          @size-change="fetchProducts"
          @current-change="fetchProducts"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const products = ref([])
const categories = ref([])

const filters = reactive({
  search: '',
  category: null,
  isPublic: null
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

let searchTimeout = null

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

function handleSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.page = 1
    fetchProducts()
  }, 300)
}

async function fetchProducts() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }

    if (filters.search) params.search = filters.search
    if (filters.category) params.category_id = filters.category
    if (filters.isPublic !== null) params.is_public = filters.isPublic

    const response = await api.get('/products', { params })

    if (response.data.success) {
      products.value = response.data.data.products || response.data.data || []
      pagination.total = response.data.data.pagination?.totalItems || response.data.data.total || products.value.length
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách sản phẩm')
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const response = await api.get('/categories')
    if (response.data.success) {
      categories.value = response.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

async function handleDelete(product) {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`,
      'Xác nhận xóa',
      {
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        type: 'warning'
      }
    )

    const response = await api.delete(`/products/${product.id}`)
    if (response.data.success) {
      ElMessage.success('Xóa sản phẩm thành công')
      fetchProducts()
    } else {
      ElMessage.error(response.data.message || 'Xóa thất bại')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Lỗi khi xóa sản phẩm')
    }
  }
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<style lang="scss" scoped>
.products-page {
  .el-select {
    width: 100%;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;

    h2 {
      margin: 0;
    }
  }

  .filter-section {
    .el-col {
      margin-bottom: 10px;
    }
  }
}

// Mobile responsive
@media screen and (max-width: 768px) {
  .products-page {
    .page-header {
      h2 {
        font-size: 18px;
      }
    }

    .data-table {
      :deep(.el-table) {
        font-size: 12px;

        .product-image {
          width: 40px;
          height: 40px;
        }

        // Ẩn một số cột không quan trọng trên mobile
        .el-table__cell:nth-child(5),
        .el-table__cell:nth-child(6) {
          display: none;
        }
      }

      :deep(.el-pagination) {
        flex-wrap: wrap;
        justify-content: center;

        .el-pagination__sizes {
          display: none;
        }
      }
    }
  }
}
</style>
