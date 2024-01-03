const express = require('express');
const router = express.Router();
const Multer = require('multer');
const imgUpload = require('../modules/imgUpload');

const multer = Multer({
    storage: Multer.MemoryStorage,
    fileSize: 5 * 1024 * 1024,
});

let records = []; // In-memory storage

router.get('/dashboard', (req, res) => {
    const monthRecords = records.filter((record) => {
        const recordDate = new Date(record.date);
        return (
            recordDate.getMonth() === new Date().getMonth() &&
            recordDate.getFullYear() === new Date().getFullYear()
        );
    });

    const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);

    res.json({
        month_records: monthRecords.length,
        total_amount: totalAmount,
    });
});

router.get('/getrecords', (req, res) => {
    res.json(records);
});

router.get('/getlast10records', (req, res) => {
    const last10Records = records.slice(-10).reverse();
    res.json(last10Records);
});

router.get('/gettopexpense', (req, res) => {
    const topExpenseRecords = records
        .filter((record) => record.amount < 0)
        .slice(0, 10);
    res.json(topExpenseRecords);
});

router.get('/getrecord/:id', (req, res) => {
    const id = req.params.id;
    const record = records.find((record) => record.id === id);

    if (record) {
        res.json(record);
    } else {
        res.status(404).send({ message: 'Record not found' });
    }
});

router.get('/searchrecords', (req, res) => {
    const s = req.query.s.toLowerCase();

    const searchResults = records.filter(
        (record) =>
            record.name.toLowerCase().includes(s) ||
            record.notes.toLowerCase().includes(s),
    );

    res.json(searchResults);
});

router.post('/insertrecord', multer.single('attachment'), imgUpload.uploadToGcs, (req, res) => {
    const name = req.body.name;
    const amount = req.body.amount;
    const date = req.body.date;
    const notes = req.body.notes;
    let imageUrl = '';

    if (req.file && req.file.cloudStoragePublicUrl) {
        imageUrl = req.file.cloudStoragePublicUrl;
    }

    const newRecord = {
        id: generateUniqueId(),
        name,
        amount,
        date,
        notes,
        attachment: imageUrl,
    };

    records.push(newRecord);
    res.send({ message: 'Insert Successful' });
});

router.put(
    '/editrecord/:id',
    multer.single('attachment'),
    imgUpload.uploadToGcs,
    (req, res) => {
        const id = req.params.id;
        const { name, amount, date, notes } = req.body;
        const imageUrl = req.file ? req.file.cloudStoragePublicUrl : '';

        const index = records.findIndex((record) => record.id === id);

        if (index !== -1) {
            records[index] = {
                id,
                name,
                amount,
                date,
                notes,
                attachment: imageUrl,
            };

            res.send({ message: 'Update Successful' });
        } else {
            res.status(404).send({ message: 'Record not found' });
        }
    },
);

router.delete('/deleterecord/:id', (req, res) => {
    const id = req.params.id;

    records = records.filter((record) => record.id !== id);

    res.send({ message: 'Delete successful' });
});

router.post(
    '/uploadImage',
    multer.single('image'),
    imgUpload.uploadToGcs,
    (req, res, next) => {
        const data = req.body;
        data.imageUrl = req.file ? req.file.cloudStoragePublicUrl : '';

        res.send(data);
    },
);

// Function to generate a unique ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = router;
