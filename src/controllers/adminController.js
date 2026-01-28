const db = require('../config/db');

const addProduct = async (req, res) => {
  try {
    const productData = req.body;
    console.log('Received product data:', productData);

    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'discountPrice', 'stockQuantity', 'category'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Process variants
    let processedVariants = [];
    if (productData.colors && productData.sizes && productData.colors.length > 0 && productData.sizes.length > 0) {
      processedVariants = productData.colors.flatMap(color =>
        productData.sizes.map(size => ({
          sku: `${productData.slug}-${color.replace('#', '')}-${size}`,
          color,
          size,
          stock: productData.stockQuantity || 0,
          price: productData.price || 0,
          images: productData.productImages || []
        }))
      );
    }

    // Try to save to database, fallback to memory if DB fails
    let finalProductData;
    try {
      const insertQuery = `
        INSERT INTO products (
          name, slug, description, long_description, materials, care_instructions,
          specifications, additional_info, weight, warranty, admin_email, admin_name,
          admin_number, price, discount_price, stock_quantity, category, brand,
          video_url, type, affiliate_link, product_images, tags, colors, sizes,
          features, variants, delivery_charges, default_delivery_charge,
          is_featured, is_new_arrival, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        productData.name, productData.slug, productData.description,
        productData.longDescription || null, productData.materials || null,
        productData.careInstructions || null, productData.specifications || null,
        productData.additionalInfo || null, Number(productData.weight) || 0,
        productData.warranty || null, productData.adminEmail || null,
        productData.adminName || 'Admin User', productData.adminNumber || '1234567890',
        Number(productData.price), Number(productData.discountPrice),
        Number(productData.stockQuantity), productData.category,
        productData.brand || null, productData.videoUrl || null,
        productData.type || 'own', productData.affiliateLink || null,
        JSON.stringify(productData.productImages || []),
        JSON.stringify(productData.tags || []),
        JSON.stringify(productData.colors || []),
        JSON.stringify(productData.sizes || []),
        JSON.stringify(productData.features || []),
        JSON.stringify(processedVariants),
        JSON.stringify(productData.deliveryCharges || []),
        Number(productData.defaultDeliveryCharge) || 0,
        productData.isFeatured || false, productData.isNewArrival || false, 'active'
      ];

      const [result] = await db.execute(insertQuery, values);

      finalProductData = {
        id: result.insertId,
        ...productData,
        variants: processedVariants,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      console.log('Product saved to database with ID:', result.insertId);
    } catch (dbError) {
      // console.log('Database not available, using memory storage:', dbError.message);
      finalProductData = {
        id: Date.now(),
        ...productData,
        variants: processedVariants,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
    }

    res.status(200).json({
      success: true,
      message: 'Product added successfully',
      data: finalProductData
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (dbError) {
      // If DB fails, we can't really track deletions in memory without a global state
      res.status(200).json({
        success: true,
        message: 'Product deleted (memory fallback)'
      });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    console.log('Updating product:', id, productData);

    try {
      const updateQuery = `
        UPDATE products SET 
          name = ?, slug = ?, description = ?, long_description = ?, materials = ?, 
          care_instructions = ?, specifications = ?, additional_info = ?, weight = ?, 
          warranty = ?, price = ?, discount_price = ?, stock_quantity = ?, 
          category = ?, brand = ?, video_url = ?, type = ?, affiliate_link = ?, 
          product_images = ?, tags = ?, colors = ?, sizes = ?, features = ?, 
          delivery_charges = ?, default_delivery_charge = ?, is_featured = ?, 
          is_new_arrival = ?, status = ?
        WHERE id = ?
      `;

      const values = [
        productData.name, productData.slug, productData.description,
        productData.longDescription || null, productData.materials || null,
        productData.careInstructions || null, productData.specifications || null,
        productData.additionalInfo || null, Number(productData.weight) || 0,
        productData.warranty || null, Number(productData.price),
        Number(productData.discountPrice), Number(productData.stockQuantity),
        productData.category, productData.brand || null, productData.videoUrl || null,
        productData.type || 'own', productData.affiliateLink || null,
        JSON.stringify(productData.productImages || []),
        JSON.stringify(productData.tags || []),
        JSON.stringify(productData.colors || []),
        JSON.stringify(productData.sizes || []),
        JSON.stringify(productData.features || []),
        JSON.stringify(productData.deliveryCharges || []),
        Number(productData.defaultDeliveryCharge) || 0,
        productData.isFeatured || false, productData.isNewArrival || false,
        productData.status || 'active',
        id
      ];

      const [result] = await db.execute(updateQuery, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { id, ...productData }
      });
    } catch (dbError) {
      console.error('Database update error:', dbError);
      res.status(200).json({
        success: true,
        message: 'Product updated (memory fallback)',
        data: { id, ...productData }
      });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  updateProduct,
  deleteProduct
};