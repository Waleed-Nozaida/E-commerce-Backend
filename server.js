const express = require("express");
const app = express();
const {Client} = require("pg"); 

app.use(express.json());

/*
******************Database Initialization***********************
*/

const DB_NAME  = 'e-commerce';
const DB_USER  = 'postgres';
const DB_HOST  = 'localhost';
const DB_PASSWORD  = 'mysecretpassword';


(async () => {
    
    const client = new Client({
        host: DB_HOST,
        port: 5432,
        user: DB_USER,
        password: DB_PASSWORD,
        database: 'postgres'
    });

    await client.connect();
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);

    if (res.rowCount === 0) {
        console.log(`${DB_NAME} database not found, creating it.`);
        await client.query(`CREATE DATABASE "${DB_NAME}";`);
        console.log(`created database ${DB_NAME}`);
    } else {
        console.log(`${DB_NAME} database exists.`);
    }

    await client.end();
    
    try {
        const dbClient = getDbClient();
        await dbClient.connect();
        // The information_schema in PostgreSQL is a built-in, SQL-standard set of read-only views that provide metadata about database objects (tables, columns, constraints, views, etc.)
        const products_exist = await dbClient.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')");
        // console.log(products_exist.rows[0].exists);
        if (!products_exist.rows[0].exists)
        {
            // SERIALIZE skips an increment even when duplicates are added, not usable for our purpose
            await dbClient.query("CREATE TABLE products (id INT UNIQUE NOT NULL, title VARCHAR(100) NOT NULL, price INT NOT NULL, image_url VARCHAR(200) NOT NULL, PRIMARY KEY(title, image_url))");
            console.log("Products Table Created!");
        }
        else
        {
            // console.log(products_exist.rows[0].exists);
            console.log("Products Table Exists");
        }
        const orders_exist = await dbClient.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders')");
        if (!orders_exist.rows[0].exists)
        {
            // await dbClient.query("CREATE TYPE products_array AS (product_id INT, title VARCHAR(100), price INT, quantity INT)");
            await dbClient.query("CREATE TABLE orders (id INT UNIQUE NOT NULL, products JSON[], total_price INT NOT NULL, created_at VARCHAR(100) UNIQUE NOT NULL)");
            console.log("Orders Table Created!");
        }
        else 
        {
            // console.log(orders_exist.rows[0].exists);
            console.log("Orders Table Exists");
        }
        // const check_exist = await dbClient.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'new')");
        // const check_exist = await dbClient.query("SELECT table_catalog, table_name FROM information_schema.tables WHERE table_schema NOT IN('information_schema', 'pg_catalog') AND table_type='BASE TABLE'");
        // console.log(check_exist.rows);

        await dbClient.end();
    } catch (err) {
        console.error(err);
    }
})();

const getDbClient = () => {
    const dbClient = new Client({
        host: DB_HOST,
        port: 5432,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
    });

    return dbClient;
}

/*
******************Product Column***********************
*/

//----------- GET Requests -----------
app.get("/api/products", async (req, res) => {

    const dbClient = getDbClient();
    await dbClient.connect();
    const get_request = await dbClient.query("SELECT * FROM products");
    await dbClient.end();

    if (get_request.rows[0])
    {
        return res.status(200).json(get_request.rows);
    }
    else
    {
        console.log(`Products Table is Empty. No Products exist in Database ${DB_NAME}`);
        return res.status(204).send("Products Table is Empty.");
    }
});


app.get("/api/products/:id", async (req, res) => {
    // console.log(req.params.id);
    const idToRetreive = Number(req.params.id);
    
    const dbClient = getDbClient();
    await dbClient.connect();
    const get_request = await dbClient.query(`SELECT * FROM products WHERE id = ${idToRetreive}`);
    // console.log(get_request.rows[0]);
    await dbClient.end();

    if (get_request.rows[0])
    {
        return res.status(200).json(get_request.rows);
    }
    else
    {
        return res.status(404).send("Product Not Found.");
    }
});

//----------- PATCH Requests -----------
app.patch("/api/products/:id", async (req, res) => {
    const idToUpdate = Number(req.params.id);

    let r = req.body;
    let update = "";
    // console.log(req.body);
    
    if (r.title) {
        if (typeof (r.title) != 'string') {
            return res.status(400).send("Input type for 'title' is of the wrong type. Use string for 'title'");
        }
        console.log(r.title);
        update += `title = '${r.title}'`;
    }
    if (r.price) {
        if (typeof (r.price) != 'number') {
            return res.status(400).send("Input type for 'number' is of the wrong type. Use integer for 'price'.");
        }
        if (update.length!=0)
        {
            update += `, price = '${r.price}'`;
        }
        else
        {
            update += `price = '${r.price}'`;
        }
    }
    if (r.image_url) {
        if (typeof (r.image_url) != 'string') {
            return res.status(400).send("Input type for 'image_url' is of the wrong type. Use string for 'image_url'.");
        }
        if (update.length!=0)
        {
            update += `, image_url = '${r.image_url}'`;
        }
        else
        {
            update += `image_url = '${r.image_url}'`;
        }
    }
    console.log("update: ", update);
    
    const dbClient = getDbClient();
    await dbClient.connect();
    const update_product = await dbClient.query(`UPDATE products SET ${update} WHERE id = ${idToUpdate}`);
    await dbClient.end();
    // console.log(update_product.rowCount);
    if (update_product.rowCount>0)
    {
        return res.status(200).send("Product updated successfully");
    }
    else
    {
        console.log("Products does not Exist!");
        return res.status(404).send("Product Not Found");
    }
});

//----------- POST Requests -----------
app.post("/api/products", async (req, res) => {
    // console.log("Body: ", req.body);
    const { title, price, image_url } = req.body;
    // console.log("title: ", title);
    // console.log("price: ", price);
    // console.log("image: ", image_url);

    if (!title) {
        const error = {
            "error": "ValidationError",
            "message": "Required field 'title' is missing" 
        };
        return res.status(400).json(error);
    }
    else if (!price) {
        const error = {
            "error": "ValidationError",
            "message": "Required field 'price' is missing" 
        };
        return res.status(400).json(error);
    }
    else if (!image_url) {
        const error = {
            "error": "ValidationError",
            "message": "Required field 'image_url' is missing" 
        };
        return res.status(400).json(error);
    }
    else if (typeof (title) != 'string' || typeof (price) != 'number' || typeof (image_url) != 'string') {
        const error = {
            "error": "ValidationError",
            "message": "Required fields are of the wrong type. Use string for 'title' and 'image_url'. Use integer for 'price'." 
        };
        return res.status(400).json(error);
    }

    const dbClient = getDbClient();
    await dbClient.connect();
    const id_param = await dbClient.query("SELECT MAX(id) FROM products");
    // console.log (id_param.rows[0].max);
    const post_product = await dbClient.query(`INSERT INTO products (id, title, price, image_url) VALUES ($1, $2, $3, $4)`, [id_param.rows[0].max+1, title, price, image_url]);
    await dbClient.end();
    return res.status(201).send("Product created successfully");
});


//----------- DELETE Requests -----------
app.delete("/api/products/:id", async (req, res) => {
    const idToBeDeleted = Number(req.params.id);

    const dbClient = getDbClient();
    await dbClient.connect();
    const delete_product = await dbClient.query(`DELETE FROM products WHERE id=${idToBeDeleted}`);
    await dbClient.end();
    // console.log(delete_product);
    if (delete_product.rowCount==0 || !delete_product)
    {
        return res.status(404).send("Product not found");
    }
    return res.status(200).send("Product deleted successfully!");
});

/*
******************Order Column***********************
*/

//----------- GET Requests -----------
app.get("/api/orders", async (req, res) => {

    const dbClient = getDbClient();
    await dbClient.connect();
    const get_orders = await dbClient.query("SELECT * FROM orders");
    await dbClient.end();

    if (get_orders.rows[0])
    {
        return res.status(200).json(get_orders.rows);
    }
    else
    {
        console.log(`Orders Table is Empty. No Orders exist in Database ${DB_NAME}`);
        return res.status(204).send("Orders Table is Empty.");
    }
});

//----------- POST Requests -----------
app.post("/api/orders", async (req, res) => {
    const new_order = req.body;
    // console.log("new_order: \n", new_order);
    const dbClient = getDbClient();
    await dbClient.connect();
    
    let new_order_products = [];
    let sum = 0;
    let time_created = new Date().toISOString();
    
    for (let i=0; i<new_order.products.length; i++)
    {
        // console.log(new_order.products[i]);
        // console.log(new_order.products[i].product_id);
        if (!new_order.products[i].product_id || new_order.products[i].product_id<=0)
        {
            const error = {
            "error": "ValidationError",
            "message": "Required field 'product_id' is missing or less than a minimum value of 1" 
            };
            return res.status(400).json(error);
        }
        else if (!new_order.products[i].quantity || new_order.products[i].quantity<=0)
        {
            const error = {
            "error": "ValidationError",
            "message": "Required field 'quantity' is missing or less than a minimum value of 1" 
            };
            return res.status(400).json(error);
        }
        else if (typeof(new_order.products[i].product_id)!= 'number' || typeof(new_order.products[i].quantity)!='number')
        {
            const error = {
            "error": "ValidationError",
            "message": "Input type are of wrong type. Use integer for both 'product_id' and 'quantity'" 
            };
            return res.status(400).json(error);
        }
        
        const find_product = await dbClient.query(`SELECT id, title, price FROM products WHERE products.id = ${new_order.products[i].product_id}`);
        // console.log(find_product.rows[0]);
        if (!find_product.rows[0])
        {
            console.log(`No Product found with the provided product_id: ${new_order.products[i].product_id}`);
            return res.status(400).send(`No Product found with the provided product_id: ${new_order.products[i].product_id}`)
        }
        const product_object = 
        {
            "product_id": find_product.rows[0].id,
            "title": `${find_product.rows[0].title}`,
            "price": find_product.rows[0].price,
            "quantity": new_order.products[i].quantity
        }

        console.log(product_object);
        new_order_products.push(product_object);
        sum += (Number(product_object.price) * Number(product_object.quantity)); 
    }
    console.log(new_order_products);
    
    const id_param = await dbClient.query("SELECT MAX(id) FROM orders");
    
    // console.log("id: ",id_param.rows[0].max+1);
    // console.log("products: "+products_array);
    // console.log("total_price: "+sum);
    // console.log("created_at: "+time_created)
    
    const update_id = await dbClient.query(`INSERT INTO orders (id, products, total_price, created_at) VALUES ($1, $2, $3, $4)`, [id_param.rows[0].max+1, new_order_products, sum, time_created]);
    await dbClient.end();
    return res.status(201).send("Order placed successfully");
})

// app.listen(5600, () => console.log('Server listening on port 5600'));
const PORT = process.env.PORT || 5600;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});