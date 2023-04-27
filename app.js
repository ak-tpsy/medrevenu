const identityPoolId = "us-west-1:75cda94d-eeec-4f77-be2f-131fc5015318";
const region = 'us-west-1';
AWS.config.region = region;

document.addEventListener('DOMContentLoaded', function () {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const humanReadableTimestamp = `${day}-${month}-${hours}-${minutes}-${seconds}_${year}`;
    console.log(humanReadableTimestamp);

    const uncorrectedClaimsInput = document.getElementById('uncorrectedClaims');
    const correctedClaimsInput = document.getElementById('correctedClaims');
    const passcodeInput = document.getElementById('passcode');
    const uploadButton = document.getElementById('uploadButton');
  
    const bucketName = 'medrevenutest1'; // Replace with your bucket name
  
    async function getAWSCredentials(passcode) {
        console.log("checking for aws credentials")
        // Your logic for validating the passcode
        const isValidPasscode = await validatePasscode(passcode);
        console.log("this is passcode")
        console.log(passcode);
        console.log("valid passcode??");
        console.log(isValidPasscode);
        if (!isValidPasscode) {
          throw new Error('Invalid passcode');
        }
      
        const cognitoIdentity = new AWS.CognitoIdentity();
        const params = {
          IdentityPoolId: identityPoolId,
        };
      
        return new Promise((resolve, reject) => {
          cognitoIdentity.getId(params, (err, data) => {
            if (err) {
              reject(err);
            } else {
              cognitoIdentity.getCredentialsForIdentity(
                {
                  IdentityId: data.IdentityId,
                },
                (err, data) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(data);
                  }
                }
              );
            }
          });
        });
      }
      async function validatePasscode(passcode) {
        try {
          const apiUrl = 'https://a5b1nof75f.execute-api.us-west-1.amazonaws.com/prod';
          console.log("Called the passcode API");
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passcode: passcode })
          });
          if (!response.ok) {
            console.log("Error passcode");
            document.getElementById('error-message').innerText = 'Incorrect passcode. Please try again.';
            throw new Error('Error validating passcode');

          }
      
          const data = await response.json();
          console.log("Data");
          console.log(data);
          return data.isValid;
        } catch (error) {
          console.error('Error:', error);
          return false;
        }
      }
    async function uploadFile(file, fileName, passcode) {
      try {
        const data = await getAWSCredentials(passcode);
  
        AWS.config.update({
          accessKeyId: data.Credentials.AccessKeyId,
          secretAccessKey: data.Credentials.SecretKey,
          sessionToken: data.Credentials.SessionToken,
        });
  
        const s3 = new AWS.S3();
  
        const params = {
          Bucket: bucketName,
          Key: fileName,
          Body: file,
          ContentType: file.type,
          ACL: 'private',
          ServerSideEncryption: 'AES256',
        };
  
        return new Promise((resolve, reject) => {
          s3.upload(params, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      } catch (err) {
        throw err;
      }
    }
  
    function validateInputs() {
      if (!uncorrectedClaimsInput.files.length) {
        alert('Please provide the uncorrected claims file.');
        return false;
      }
  
      if (!passcodeInput.value.trim()) {
        alert('Please provide the passcode.');
        return false;
      }
  
      return true;
    }
  
    uploadButton.addEventListener('click', async () => {
      if (!validateInputs()) return;
  
      const uncorrectedClaimsFile = uncorrectedClaimsInput.files[0];
      const uncorrectedClaimsFileName = `${humanReadableTimestamp}/uncorrected/${uncorrectedClaimsFile.name}`;
        
      const correctedClaimsFile = correctedClaimsInput.files[0];
      let correctedClaimsFileName;
    
      if (correctedClaimsFile) {
        correctedClaimsFileName = `${humanReadableTimestamp}/corrected/${correctedClaimsFile.name}`;
      }
      const passcode = passcodeInput.value.trim();
  
      try {
        const uncorrectedUploadResult = await uploadFile(uncorrectedClaimsFile, uncorrectedClaimsFileName, passcode);
        console.log('Uncorrected claims upload success:', uncorrectedUploadResult);
        document.getElementById('error-message').innerText = '';
        if (correctedClaimsFile) {
          const correctedUploadResult = await uploadFile(correctedClaimsFile, correctedClaimsFileName, passcode);
          console.log('Corrected claims upload success:', correctedUploadResult);
        }
        document.getElementById('upload-status').innerText = 'File(s) uploaded successfully.';
      } catch (error) {
        if (error.message === 'Invalid passcode') {
            document.getElementById('error-message').innerText = 'Incorrect passcode. Please try again.';
          } else {
            console.error('An error occurred:', error);
          }
      }
    });
  });
  