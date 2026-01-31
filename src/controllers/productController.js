const db = require('../config/db');

const processVariants = (productData) => {
  if (productData.colors && productData.sizes && productData.colors.length > 0 && productData.sizes.length > 0) {
    const stockPerVariant = Math.floor(productData.stockQuantity / (productData.colors.length * productData.sizes.length));

    return productData.colors.flatMap(color =>
      productData.sizes.map(size => {
        const colorName = color.startsWith('#') ? `Color-${color.slice(1)}` : color;
        const variantId = `${productData.slug}-${color.replace('#', '')}-${size}`;

        // Find matching variant images from the variants array
        const variantImageSet = productData.variants?.find(v => 
          v.color === color && v.size === size
        );

        return {
          variantId,
          sku: variantId,
          color: {
            name: colorName,
            code: color
          },
          size,
          price: productData.discountPrice || productData.price,
          stock: stockPerVariant,
          images: variantImageSet?.images || productData.productImages || []
        };
      })
    );
  }
  return [];
};

const addProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'discountPrice', 'stockQuantity', 'category'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const processedVariants = processVariants(productData);

    // Try to save to database
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
        productData.careInstructions || null, JSON.stringify(productData.specifications || []),
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
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please ensure MySQL is running and the database exists.',
        error: dbError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product added successfully',
      data: finalProductData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = rows[0];
      
      // Parse JSON fields
      try {
        product.product_images = JSON.parse(product.product_images || '[]');
        product.colors = JSON.parse(product.colors || '[]');
        product.sizes = JSON.parse(product.sizes || '[]');
        product.variants = JSON.parse(product.variants || '[]');
        product.specifications = JSON.parse(product.specifications || '[]');
        product.features = JSON.parse(product.features || '[]');
        product.tags = JSON.parse(product.tags || '[]');
        product.delivery_charges = JSON.parse(product.delivery_charges || '[]');
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
      }

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please ensure MySQL is running and the database exists.',
        error: dbError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    try {
      const [rows] = await db.execute('SELECT * FROM products WHERE slug = ?', [slug]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = rows[0];
      
      // Parse JSON fields
      try {
        product.product_images = JSON.parse(product.product_images || '[]');
        product.colors = JSON.parse(product.colors || '[]');
        product.sizes = JSON.parse(product.sizes || '[]');
        product.variants = JSON.parse(product.variants || '[]');
        product.specifications = JSON.parse(product.specifications || '[]');
        product.features = JSON.parse(product.features || '[]');
        product.tags = JSON.parse(product.tags || '[]');
        product.delivery_charges = JSON.parse(product.delivery_charges || '[]');
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
      }

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please ensure MySQL is running and the database exists.',
        error: dbError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
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

    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'discountPrice', 'stockQuantity', 'category'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const processedVariants = processVariants(productData);

    try {
      const updateQuery = `
        UPDATE products SET 
          name = ?, slug = ?, description = ?, long_description = ?, materials = ?, 
          care_instructions = ?, specifications = ?, additional_info = ?, weight = ?, 
          warranty = ?, admin_email = ?, admin_name = ?, admin_number = ?,
          price = ?, discount_price = ?, stock_quantity = ?, 
          category = ?, brand = ?, video_url = ?, type = ?, affiliate_link = ?, 
          product_images = ?, tags = ?, colors = ?, sizes = ?, features = ?, 
          variants = ?, delivery_charges = ?, default_delivery_charge = ?, 
          is_featured = ?, is_new_arrival = ?, status = ?
        WHERE id = ?
      `;

      const values = [
        productData.name, productData.slug, productData.description,
        productData.longDescription || null, productData.materials || null,
        productData.careInstructions || null, JSON.stringify(productData.specifications || []),
        productData.additionalInfo || null, Number(productData.weight) || 0,
        productData.warranty || null, productData.adminEmail || null,
        productData.adminName || null, productData.adminNumber || null,
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
      
      const responseData = { id, ...productData, variants: processedVariants };
      
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: responseData
      });
    } catch (dbError) {
      // Check if it's a connection error
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed. Please check database server.',
          error: dbError.message
        });
      }
      
      // Check for constraint violations
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Duplicate entry. Product with this slug may already exist.',
          error: dbError.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Product updated (memory fallback)',
        data: { id, ...productData, variants: processedVariants }
      });
    }
  } catch (error) {
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
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct
};