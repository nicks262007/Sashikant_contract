const { KmsKeyringNode, encrypt, decrypt } = require("@aws-crypto/client-node");
const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

const generatorKeyId = process.env.KMS_GENERATOR_KEYID;
const keyIds = [process.env.KMS_KEYIDS];
const keyring = new KmsKeyringNode({ generatorKeyId, keyIds });
const BUCKET_NAME = 's3-encry-demo';

AWS.config.update({
  maxRetries: 3,
  httpOptions: {timeout: 30000, connectTimeout: 5000},
  region: 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});
const params = {
  Bucket: BUCKET_NAME,
  CreateBucketConfiguration: {
      // Set your region here
      LocationConstraint: "eu-west-1"
  }
};

const context = {
  stage: "thisisit",
  purpose: "for demo",
  origin: "eu-west-1"
}

createBucket = async () => {
  await s3.createBucket(params, function (err, data) {
    if (err) console.log(err, err.stack);
    else console.log('Bucket Created Successfully', data.Location);
  });
}  

const readFile = (fileName ) => {
  return new Promise( (resolve, reject) => {
      var params = { Bucket: BUCKET_NAME, Key: fileName };
      s3.getObject(params, function (err, data) {
          if (err) {
              reject(err.message);
          } else {
              var data = Buffer.from(data.Body).toString('utf8');
              resolve(data);
          }
      });
  });
}

uploadFile = async (fileName) => {

  const fileContent = await fs.readFileSync(fileName);
  console.log("FILE CONTENT IS  ",fileContent)
  // Setting up S3 upload parameters
  let data = await encryptData(fileContent, context)
  console.log("FILE Data IS  ",data)
  const params = {
      Bucket: BUCKET_NAME,
      Key: fileName, // File name you want to save as in S3
      Body: data.toString()
  };

  // Uploading files to the bucket
  s3.upload(params, function (err, data) {
      if (err) {
          throw err;
      }
  console.log(`File uploaded successfully. ${data.Location}`);
  });
};
 
encryptData = async (privData, context) => {
  try {
    const { result } = await encrypt(keyring, privData);
    return result;
  } catch (e) {
    console.log(e);
  }
};

decryptData = async (encryptedData) => {
  try {
    const { plaintext, messageHeader } = await decrypt(keyring, encryptedData);
    console.log("===== Message Header =======");
    return plaintext.toString();
  } catch (e) {
    console.log(e);
  }
};



async function init() {

   /* console.log("===== Encrypted Key File Data upload ======");
  await uploadFile('pubkey4'); */  

   console.log("Reading File");
  
  let encryptedData = await readFile('pubkey4');
  console.log("Reading File************",encryptedData); 
  let decryptedText = await decryptData(encryptedData);
  console.log("Decrypted Key",decryptedText);

}

init();
