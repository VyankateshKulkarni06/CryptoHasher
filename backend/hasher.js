const crypto = require('crypto');

// --- Function to generate a key from the password ---
function generateKeyFromPassword(password) {
    const key = crypto.createHash('sha256').update(password).digest();
    console.log("Generated Key from Password:", key.toString('hex')); // Log generated key
    return key;
}

// --- Function to encrypt the message ---
function encrypt(message, password) {
    const key = generateKeyFromPassword(password);
    const iv = crypto.randomBytes(16);  // Initialization vector (random)

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    console.log("Generated IV:", iv.toString('hex')); // Log IV
    return { encryptedMessage: encrypted, iv: iv.toString('hex') };
}

// --- Function to decrypt the message ---
function decrypt(encryptedMessage, password, iv) {
    const key = generateKeyFromPassword(password);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

async function testEncryption(input, password) {
    console.log("🔐 Encrypting the message...");
    const { encryptedMessage, iv } = encrypt(input, password);
    console.log("✅ Encrypted Message:", encryptedMessage);
    console.log("✅ IV (for decryption):", iv);

    return { encryptedMessage, iv };  // Returning the encrypted message and IV for later decryption
}

// Test Function 2: Decrypt with the password
async function testDecryption(storedHash, iv, password) {
    try {
        const { encryptedMessage } = storedHash;
        const decrypted = decrypt(encryptedMessage, password, iv);
        console.log("\n🔓 Decrypted message with correct password:", decrypted);
    } catch (error) {
        console.log("❌ Decryption failed:", error.message); 
    }
}

// Function to encrypt message and return results
async function test_encrypt(input, password) {
    const storedHash = await testEncryption(input, password);  // First function to get the encrypted message
    return storedHash;  // Return the encrypted message and IV for decryption
}

// Function to decrypt using encrypted message and IV passed dynamically
async function testdecrypt(encryptedMessage, iv, password) {
    try {
        await testDecryption({ encryptedMessage }, iv, password);
    } catch (error) {
        console.log("❌ Decryption failed:", error.message); 
    }
}


// test_encrypt(input,pass);
// testdecrypt(storeshash,iv,pass);
