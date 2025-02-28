const express = require('express');
const SearchController = require("./controllers/SearchController")
const authMiddleware = require('./middlewares/auth');
const roleMiddleware = require('./middlewares/role');

const router = express.Router();

router.get('/search/doctors/:query',authMiddleware, SearchController.searchDoctor);
router.get('/search/users/:query',authMiddleware, SearchController.searchUser);
router.get('/search/hospitals/:query',authMiddleware, SearchController.searchHospital);
router.get('/search/specialities/:query',authMiddleware, SearchController.searchSpeciality);

router.get('/search/drug/:query', SearchController.searchDrug);
router.post('/drug/add', SearchController.addDrugIfNotExists);


module.exports = router;