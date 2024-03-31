import natural from 'natural';

const RESULTS = {
    BOX: 'only box',
    FIGS: 'only figurines',
} 

function train() {
    const classifier = new natural.BayesClassifier();
    classifier.addDocument('Solo BOX Lego technic 8480 “Space shuttle', RESULTS.BOX);
    classifier.addDocument('Caixa vazia Lego Home Alone 21330', RESULTS.BOX);
    classifier.addDocument('Caixa vazia', RESULTS.BOX);
    classifier.addDocument('Boîte lego vide', RESULTS.BOX);
    classifier.addDocument('Lot des 5 Figurines et Accessoires du Set Lego 60046 Police et Voleurs', RESULTS.FIGS);
}