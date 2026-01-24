import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Models from "../models/response/ResponseModel.js";
import fs from "fs";

const router = express.Router();

router.use(express.json());

// Khởi tạo Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0"
});
const imgTableData = JSON.parse(fs.readFileSync("./static/image_table.json", "utf-8"));
const productData = JSON.parse(fs.readFileSync("./static/products.json", "utf-8"));
const productDetailData = JSON.parse(fs.readFileSync("./static/product_details.json", "utf-8"));

// Kết hợp thông tin sản phẩm, chi tiết và hình ảnh
const productsWithDetails = productData.map(product => {
    const details = productDetailData.filter(detail => detail.product_id === product.id);
    const images = imgTableData.filter(img => img.model_id === product.id && img.model_name === "PRODUCT");
    
    return {
        id: product.id,
        name: product.name,
        img: images.length > 0 ? images[0].path : product.img_preview, 
        details: details.map(d => ({
            color: d.color,
            size: d.size,
            price: d.price
        }))
    };
});

router.post("/chat", async (req, res) => {
    try {
        const { prompt } = req.body;

        const lowerPrompt = prompt.toLowerCase();
        let relevantProducts = [];

        // Keywords liên quan đến sản phẩm (KHÔNG bao gồm từ chào hỏi)
        const productKeywords = ['jean', 'quần', 'áo', 'hoodie', 'váy', 'đầm', 'nam', 'nữ', 'đen', 'trắng', 'xanh', 'hồng', 'giá', 'size', 'màu', 'sản phẩm', 'đồ', 'thời trang'];
        const matchedKeywords = productKeywords.filter(keyword => lowerPrompt.includes(keyword));

        // Nếu không có keyword liên quan đến sản phẩm -> chat thông thường
        if (matchedKeywords.length === 0) {
            const generalContext = `
                Bạn là AI tư vấn bán hàng của shop thời trang Clothing Store.
                Trả lời ngắn gọn, thân thiện.

                Câu hỏi/tin nhắn của khách hàng: "${prompt}"

                QUY TẮC:
                - Nếu khách chào hỏi, hãy chào lại thân thiện và hỏi xem họ cần tư vấn gì
                - Nếu khách hỏi về shop, giới thiệu ngắn gọn về Clothing Store - shop thời trang đa dạng
                - Nếu khách muốn tìm sản phẩm, hãy hỏi họ muốn tìm loại sản phẩm gì (áo, quần, váy...)
                - KHÔNG gợi ý sản phẩm cụ thể trong tin nhắn này
            `;

            const reply = await callGeminiWithRetry(generalContext);

            return res.status(200).json(new Models.ResponseModel(true, null, {
                reply: reply,
                products: []
            }));
        }

        // Có keyword -> tìm sản phẩm
        relevantProducts = productsWithDetails.filter(p => {
            const productName = p.name.toLowerCase();
            return matchedKeywords.some(keyword => productName.includes(keyword));
        });

        relevantProducts = relevantProducts.slice(0, 3);

        // Nếu không tìm thấy sản phẩm phù hợp
        if (relevantProducts.length === 0) {
            const noProductContext = `
                Bạn là AI tư vấn bán hàng của shop thời trang Clothing Store.
                Khách hàng hỏi: "${prompt}"

                Hiện tại shop chưa có sản phẩm phù hợp với yêu cầu này.
                Hãy trả lời thân thiện, xin lỗi vì chưa có sản phẩm phù hợp và hỏi xem khách có muốn tìm loại sản phẩm khác không.
            `;

            const reply = await callGeminiWithRetry(noProductContext);

            return res.status(200).json(new Models.ResponseModel(true, null, {
                reply: reply,
                products: []
            }));
        }

        // Tạo thông tin chi tiết sản phẩm cho AI
        const productInfo = relevantProducts.map(product => {
            const details = product.details.map(d =>
                `- Màu: ${d.color}, Size: ${d.size}, Giá: ${d.price}đ`
            ).join('\n');
            return `[ID: ${product.id}] ${product.name} \n${product.img}\n${details}`;
        }).join('\n\n');

        // Tạo danh sách ID sản phẩm để AI tham chiếu chính xác
        const productIds = relevantProducts.map(p => p.id).join(', ');

        const context = `
            Bạn là AI tư vấn bán hàng. Trả lời ngắn gọn, thân thiện và CHỈ gợi ý sản phẩm có trong danh sách dưới đây.

            DANH SÁCH SẢN PHẨM CÓ SẴN (CHỈ ĐƯỢC GỢI Ý NHỮNG SẢN PHẨM NÀY):
            ${productInfo}

            Câu hỏi khách hàng: "${prompt}"

            QUY TẮC QUAN TRỌNG:
            1. CHỈ ĐƯỢC gợi ý sản phẩm có ID trong danh sách: [${productIds}]
            2. KHÔNG ĐƯỢC gợi ý sản phẩm không có trong danh sách trên
            3. CHỈ GỢI Ý 1 SẢN PHẨM PHÙ HỢP NHẤT - không gợi ý nhiều sản phẩm
            4. Khi gợi ý sản phẩm, hãy nói "Bạn có thể click vào tên sản phẩm để xem chi tiết"
            5. ID sản phẩm (trong dấu []) chỉ để tham chiếu nội bộ, KHÔNG hiển thị cho khách hàng
            6. CUỐI CÂU TRẢ LỜI, hãy thêm dòng: "RECOMMENDED_PRODUCTS: [ID]" với chỉ 1 ID sản phẩm bạn đã gợi ý

            Khi gợi ý sản phẩm, hãy cung cấp:
            - Tên sản phẩm (có thể click để xem chi tiết)
            - Hình ảnh (URL)
            - Giá tiền
            - Size có sẵn
            - Màu sắc có sẵn

            LƯU Ý: CHỈ GỢI Ý 1 SẢN PHẨM DUY NHẤT - sản phẩm phù hợp nhất với yêu cầu của khách hàng.
            `;


        const reply = await callGeminiWithRetry(context);

        // Phân tích AI response để tìm sản phẩm được gợi ý
        let mentionedProducts = [];
        
        // Tìm dòng RECOMMENDED_PRODUCTS trong response
        const recommendedMatch = reply.match(/RECOMMENDED_PRODUCTS:\s*\[([^\]]*)\]/);
        if (recommendedMatch) {
            const recommendedIds = recommendedMatch[1].split(',').map(id => id.trim()).filter(id => id);
            mentionedProducts = relevantProducts.filter(product => recommendedIds.includes(product.id));
        } else {
            // Fallback: tìm kiếm theo tên sản phẩm nếu không có format mới
            relevantProducts.forEach(product => {
                const productNameInReply = reply.toLowerCase().includes(product.name.toLowerCase());
                if (productNameInReply) {
                    mentionedProducts.push(product);
                }
            });
        }
        
        // Đảm bảo chỉ trả về 1 sản phẩm duy nhất
        let finalProducts = [];
        if (mentionedProducts.length > 0) {
            // Lấy sản phẩm đầu tiên được AI gợi ý
            finalProducts = [mentionedProducts[0]];
        } else if (relevantProducts.length > 0) {
            // Lấy sản phẩm đầu tiên trong danh sách relevant (nếu có)
            finalProducts = [relevantProducts[0]];
        }

        // Tạo clickableProducts từ finalProducts
        const finalClickableProducts = finalProducts.map(product => ({
            id: product.id,
            name: product.name,
            img: product.img,
            details: product.details
        }));
        
        // Loại bỏ dòng RECOMMENDED_PRODUCTS khỏi response cuối cùng
        const cleanReply = reply.replace(/RECOMMENDED_PRODUCTS:\s*\[[^\]]*\]/g, '').trim();
        
        return res.status(200).json(new Models.ResponseModel(true, null, { 
            reply: cleanReply,
            products: finalClickableProducts
        }));
    } catch (err) {
        return res.status(500).json(new Models.ResponseModel(false, err.message, null));
    }
});

async function callGeminiWithRetry(context, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Gemini] Attempt ${i + 1}/${retries}...`);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Gemini API timeout')), 70000)
            );

            const resultPromise = model.generateContent(context);
            const result = await Promise.race([resultPromise, timeoutPromise]);

            console.log('[Gemini] Success!');
            return result.response.text();
        } catch (err) {
            const errorMessage = err.message || '';
            console.log(`[Gemini] Error: ${errorMessage}`);

            // Nếu là lỗi 429 (rate limit), chờ rồi retry
            if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Resource has been exhausted')) {
                console.log(`[Gemini] Rate limited, waiting 30s before retry...`);
                if (i === retries - 1) throw new Error('Hệ thống đang bận, vui lòng thử lại sau.');
                await new Promise(res => setTimeout(res, 30000));
                continue;
            }

            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

export default router;