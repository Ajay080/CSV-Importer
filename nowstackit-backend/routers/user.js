const express = require('express');
const { google } = require('googleapis');
const router= new express.Router();
const multer = require('multer');
const keys= require ('../keys.json');

const upload = multer({});

let SPREADSHEET_ID = ''; // Replace with your spreadsheet ID
let SHEET_NAME = 'Sheet1'; // Replace with your sheet name
let columnHeaders=[];

async function extractSpreadsheetId(url) {
  let spreadsheetId = null;

  // Regular expression to match the spreadsheet ID
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

  const match = url.match(regex);
  if (match && match[1]) {
    spreadsheetId = match[1];
  }

  return spreadsheetId;
}


async function writeToSheet (auth, data, selectedHeaders, startRow, endRow, startCell){

  const gsapi=google.sheets({version:'v4', auth:auth});
  const selectedHeadersArray = selectedHeaders.split(',');
    // Prepare updated data with selected headers
    const updatedData = data.slice(startRow, endRow + 1)  // Include startRow and endRow
    // const updatedData = data  // Include startRow and endRow

    .map((row) => {
      const updatedRow = [];
      selectedHeadersArray.forEach((header) => {
        const columnIndex = columnHeaders.indexOf(header);
        if (columnIndex !== -1) {
          updatedRow.push(row[columnIndex]);
        } else {
          updatedRow.push('');
        }
      });
      return updatedRow;
    });


  const UpdateOptions= {
    spreadsheetId:SPREADSHEET_ID,
    range: `${SHEET_NAME}!${startCell}`,
    valueInputOption: 'USER_ENTERED',
    resource:{values:updatedData}
  }

  let res= await gsapi.spreadsheets.values.update(UpdateOptions)
  
};

router.post('/get-data', upload.single('file'), async (req, res) => {
  // Extract the necessary data from the request
  const fileContent = req.file.buffer.toString();
  const data = fileContent.split('\n').map(row => row.split(','));
  const selectedHeaders = req.body.headers;
  const startRow = parseInt(req.body.startRow);
  const endRow = parseInt(req.body.endRow);

  const selectedHeadersArray = selectedHeaders.split(',');
    // Prepare updated data with selected headers
    const updatedData = data.slice(startRow, endRow + 1)  // Include startRow and endRow
    // const updatedData = data  // Include startRow and endRow

    .map((row) => {
      const updatedRow = [];
      selectedHeadersArray.forEach((header) => {
        const columnIndex = columnHeaders.indexOf(header);
        if (columnIndex !== -1) {
          updatedRow.push(row[columnIndex]);
        } else {
          updatedRow.push('');
        }
      });
      return updatedRow;
    });
  res.json({ updatedData});
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const selectedHeaders=req.body.headers;
  const startRow = parseInt(req.body.startRow);  // Parse startRow as an integer
  const endRow = parseInt(req.body.endRow);  // Parse endRow as an integer
  const startCell= req.body.startCell;
  try {
    SPREADSHEET_ID=await extractSpreadsheetId(req.body.url);
    SHEET_NAME=req.body.sheetName;
    const fileContent = req.file.buffer.toString();
    const csvData = fileContent.split('\n').map(row => row.split(','));

    const client = new google.auth.JWT(
      keys.client_email, 
      null, 
      keys.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    client.authorize(function(error, tokens){
      if(error){
        console.log(error);
        return;
      }
      else{
        console.log('Connected!');
        writeToSheet(client, csvData, selectedHeaders, startRow, endRow, startCell);
      }
    });
    res.status(200).send('Data uploaded to Google Sheets!');
  } catch (error) {
    console.error('Error uploading data:', error);
    res.status(500).send('Error uploading data. Please try again.');
  }
});




router.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a CSV file.' });
  }

  
  const fileBuffer = req.file.buffer.toString('utf8');
  const lines = fileBuffer.split('\n');
  // Calculate the number of rows (excluding the header row)
  const numRows = lines.length > 0 ? lines.length - 1 : 0;
  columnHeaders=[];

  let numColumns = 0;
  
  if (lines.length > 0) {
    const headers = lines[0].split(',');
    numColumns = headers.length;

    headers.forEach((header) => {
      columnHeaders.push(header);
    });
  }

  res.json({ numRows, numColumns, columnHeaders});
});


module.exports=router