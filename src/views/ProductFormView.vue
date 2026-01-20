<template>
  <div class="product-form-page">
    <div class="page-header">
      <h2>{{ isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới' }}</h2>
      <el-button @click="$router.back()">
        <el-icon><Back /></el-icon>
        Quay lại
      </el-button>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      class="product-form"
      v-loading="loading"
    >
      <el-card>
        <template #header>
          <span>Thông tin cơ bản</span>
        </template>

        <el-form-item label="Tên sản phẩm" prop="name">
          <el-input v-model="form.name" placeholder="Nhập tên sản phẩm" />
        </el-form-item>

        <el-form-item label="Giá" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :step="10000"
            :precision="0"
            style="width: 200px"
          />
          <span style="margin-left: 10px">VNĐ</span>
        </el-form-item>

        <el-form-item label="Danh mục" prop="categories">
          <el-select v-model="form.categories" multiple placeholder="Chọn danh mục">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Mô tả">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="Mô tả sản phẩm..."
          />
        </el-form-item>

        <el-form-item label="Công khai">
          <el-switch v-model="form.is_public" />
        </el-form-item>
      </el-card>

      <el-card style="margin-top: 20px">
        <template #header>
          <span>Hình ảnh sản phẩm</span>
        </template>

        <el-form-item label="Ảnh đại diện" prop="img_preview">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="uploadPreviewImage"
          >
            <img v-if="form.img_preview" :src="form.img_preview" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="Ảnh chi tiết">
          <el-upload
            v-model:file-list="productImages"
            list-type="picture-card"
            :before-upload="beforeUpload"
            :http-request="uploadProductImage"
            :on-remove="handleRemoveImage"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-card>

      <el-card style="margin-top: 20px">
        <template #header>
          <div class="card-header-with-action">
            <span>Biến thể sản phẩm (Màu sắc & Size)</span>
            <el-button type="primary" size="small" @click="addColorGroup">
              <el-icon><Plus /></el-icon>
              Thêm màu mới
            </el-button>
          </div>
        </template>

        <div v-if="colorGroups.length === 0">
          <el-empty description="Chưa có biến thể nào" />
        </div>

        <div v-for="(colorGroup, colorIndex) in colorGroups" :key="colorIndex" class="color-group">
          <div class="color-header">
            <el-input
              v-model="colorGroup.color"
              placeholder="Nhập tên màu (VD: Đen, Trắng, Xanh...)"
              style="width: 250px"
              @change="updateVariantsFromGroups"
            >
              <template #prepend>Màu</template>
            </el-input>
            <el-button type="danger" link @click="removeColorGroup(colorIndex)">
              <el-icon><Delete /></el-icon>
              Xóa màu này
            </el-button>
          </div>

          <el-table :data="colorGroup.sizes" border size="small" class="size-table">
            <el-table-column label="Size" width="200" align="center" header-align="center">
              <template #default="{ row }">
                <el-select v-model="row.size" placeholder="Size" @change="updateVariantsFromGroups">
                  <el-option label="S" value="S" />
                  <el-option label="M" value="M" />
                  <el-option label="L" value="L" />
                  <el-option label="XL" value="XL" />
                  <el-option label="XXL" value="XXL" />
                  <el-option label="Free Size" value="Free Size" />
                </el-select>
              </template>
            </el-table-column>

            <el-table-column label="Giá (VNĐ)" min-width="180" align="center" header-align="center">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.price"
                  :min="0"
                  :step="10000"
                  size="small"
                  controls-position="right"
                  style="width: 100%"
                  @change="updateVariantsFromGroups"
                />
              </template>
            </el-table-column>

            <el-table-column label="Số lượng" width="130" align="center" header-align="center">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.quantity"
                  :min="0"
                  size="small"
                  controls-position="right"
                  style="width: 100%"
                  @change="updateVariantsFromGroups"
                />
              </template>
            </el-table-column>

            <el-table-column label="" width="50" align="center" header-align="center">
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeSizeFromColor(colorIndex, $index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-button type="primary" link @click="addSizeToColor(colorIndex)" style="margin-top: 8px">
            <el-icon><Plus /></el-icon>
            Thêm size cho màu {{ colorGroup.color || 'này' }}
          </el-button>
        </div>
      </el-card>

      <div class="form-actions">
        <el-button @click="$router.back()">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? 'Cập nhật' : 'Tạo sản phẩm' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const categories = ref([])
const productImages = ref([])

const form = reactive({
  name: '',
  price: 0,
  description: '',
  is_public: true,
  img_preview: '',
  categories: [],
  variants: []
})

// Quản lý biến thể theo nhóm màu
const colorGroups = ref([])

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên sản phẩm', trigger: 'blur' }],
  price: [{ required: true, message: 'Vui lòng nhập giá', trigger: 'blur' }],
  img_preview: [{ required: true, message: 'Vui lòng tải ảnh đại diện', trigger: 'change' }]
}

// Thêm màu mới
function addColorGroup() {
  colorGroups.value.push({
    color: '',
    sizes: [
      { size: 'M', price: form.price || 0, quantity: 1 }
    ]
  })
  updateVariantsFromGroups()
}

// Xóa nhóm màu
function removeColorGroup(colorIndex) {
  colorGroups.value.splice(colorIndex, 1)
  updateVariantsFromGroups()
}

// Thêm size cho màu
function addSizeToColor(colorIndex) {
  colorGroups.value[colorIndex].sizes.push({
    size: 'M',
    price: form.price || 0,
    quantity: 1
  })
  updateVariantsFromGroups()
}

// Xóa size khỏi màu
function removeSizeFromColor(colorIndex, sizeIndex) {
  colorGroups.value[colorIndex].sizes.splice(sizeIndex, 1)
  // Nếu không còn size nào, xóa luôn nhóm màu
  if (colorGroups.value[colorIndex].sizes.length === 0) {
    colorGroups.value.splice(colorIndex, 1)
  }
  updateVariantsFromGroups()
}

// Cập nhật form.variants từ colorGroups
function updateVariantsFromGroups() {
  const variants = []
  colorGroups.value.forEach(group => {
    group.sizes.forEach(sizeItem => {
      variants.push({
        color: group.color,
        size: sizeItem.size,
        price: sizeItem.price,
        quantity: sizeItem.quantity
      })
    })
  })
  form.variants = variants
}

// Chuyển đổi variants thành colorGroups (khi load sản phẩm)
function buildColorGroupsFromVariants(variants) {
  const groupMap = new Map()

  variants.forEach(v => {
    const color = v.color || ''
    if (!groupMap.has(color)) {
      groupMap.set(color, {
        color: color,
        sizes: []
      })
    }
    groupMap.get(color).sizes.push({
      size: v.size,
      price: v.price,
      quantity: v.quantity
    })
  })

  colorGroups.value = Array.from(groupMap.values())
}

function addVariant() {
  form.variants.push({
    color: '',
    size: 'M',
    price: form.price || 0,
    quantity: 1
  })
}

function removeVariant(index) {
  form.variants.splice(index, 1)
}

function beforeUpload(file) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('Chỉ được upload file ảnh!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('Kích thước ảnh không được vượt quá 5MB!')
    return false
  }
  return true
}

async function uploadPreviewImage(options) {
  const formData = new FormData()
  formData.append('image', options.file)

  try {
    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (response.data.success) {
      form.img_preview = response.data.data.url
      ElMessage.success('Upload ảnh thành công')
    }
  } catch (error) {
    ElMessage.error('Upload ảnh thất bại')
  }
}

async function uploadProductImage(options) {
  const formData = new FormData()
  formData.append('image', options.file)

  try {
    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (response.data.success) {
      const fileItem = productImages.value.find(f => f.uid === options.file.uid)
      if (fileItem) {
        fileItem.url = response.data.data.url
      }
    }
  } catch (error) {
    ElMessage.error('Upload ảnh thất bại')
  }
}

function handleRemoveImage(file) {
  const index = productImages.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    productImages.value.splice(index, 1)
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

async function fetchProduct() {
  if (!isEdit.value) return

  loading.value = true
  try {
    const response = await api.get(`/products/${route.params.id}`)
    if (response.data.success) {
      const product = response.data.data
      form.name = product.name
      form.price = product.price
      form.description = product.description || ''
      form.is_public = product.is_public
      form.img_preview = product.img_preview
      form.categories = product.categories?.map(c => c.id) || product.Categories?.map(c => c.id) || []
      // Backend trả về product_details (alias)
      const details = product.product_details || product.ProductDetails || []
      form.variants = details.map(d => ({
        id: d.id,
        color: d.color,
        size: d.size,
        price: d.price,
        quantity: d.quantity
      }))

      // Chuyển đổi variants thành colorGroups để hiển thị
      buildColorGroupsFromVariants(form.variants)

      // Load product images
      if (product.images) {
        productImages.value = product.images.map((url, index) => ({
          uid: index,
          url,
          status: 'success'
        }))
      }
    }
  } catch (error) {
    ElMessage.error('Lỗi khi tải thông tin sản phẩm')
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
      const data = {
        name: form.name,
        price: form.price,
        description: form.description,
        is_public: form.is_public,
        img_preview: form.img_preview,
        category_ids: form.categories,
        variants: form.variants,
        images: productImages.value.map(f => f.url).filter(Boolean)
      }

      let response
      if (isEdit.value) {
        response = await api.put(`/products/${route.params.id}`, data)
      } else {
        response = await api.post('/products', data)
      }

      if (response.data.success) {
        ElMessage.success(isEdit.value ? 'Cập nhật thành công' : 'Tạo sản phẩm thành công')
        router.push('/products')
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

onMounted(() => {
  fetchCategories()
  fetchProduct()
})
</script>

<style lang="scss" scoped>
.product-form-page {
  max-width: 900px;

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

  .product-form {
    .el-select {
      width: 100%;
    }
  }

  .card-header-with-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .avatar-uploader {
    .avatar {
      width: 150px;
      height: 150px;
      object-fit: cover;
      border-radius: 8px;
    }

    :deep(.el-upload) {
      border: 1px dashed #d9d9d9;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      width: 150px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        border-color: #409eff;
      }
    }

    .avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
    }
  }

  .form-actions {
    margin-top: 30px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .color-group {
    background: #f9f9f9;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    .color-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .size-table {
      margin-top: 8px;
    }
  }
}

// Mobile responsive
@media screen and (max-width: 768px) {
  .product-form-page {
    .page-header {
      h2 {
        font-size: 18px;
      }
    }

    :deep(.el-form-item__label) {
      width: 100% !important;
      text-align: left;
    }

    :deep(.el-form-item__content) {
      margin-left: 0 !important;
    }

    .avatar-uploader {
      .avatar {
        width: 120px;
        height: 120px;
      }

      :deep(.el-upload) {
        width: 120px;
        height: 120px;
      }
    }

    .color-group {
      padding: 12px;

      .color-header {
        flex-direction: column;
        align-items: flex-start;

        .el-input {
          width: 100% !important;
        }
      }

      .size-table {
        :deep(.el-table) {
          font-size: 12px;
        }
      }
    }

    .form-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
