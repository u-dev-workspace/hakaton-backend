const express = require('express');
const SearchController = require("./controllers/SearchController")
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.get('/search/doctors/:query', SearchController.searchDoctor);
router.get('/search/users/:query', SearchController.searchUser);
router.get('/search/hospitals/:query', SearchController.searchHospital);
router.get('/search/specialities/:query', SearchController.searchSpeciality);

router.get('/search/drug/:query', SearchController.searchDrug);
router.post('/drug/add', SearchController.addDrugIfNotExists);


module.exports = router;