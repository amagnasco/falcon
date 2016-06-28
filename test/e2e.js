import path from 'path';
import chromedriver from 'chromedriver';
import webdriver from 'selenium-webdriver';
import {expect} from 'chai';
import electronPath from 'electron-prebuilt';

import {APP_STATUS_CONSTANTS,
    DIALECTS, USER_INPUT_FIELDS} from '../app/constants/constants';
import {CREDENTIALS} from './AWS_RDS_connections.js';

// import styles to use for tests
import logoStyles from '../app/components/Settings/DialectSelector/DialectSelector.css';

chromedriver.start(); // on port 9515
process.on('exit', chromedriver.stop);

const delay = time => new Promise(resolve => setTimeout(resolve, time));

describe('main window', function spec() {
    this.timeout(10000);

    before(async () => {
        await delay(1000); // wait chromedriver start time
        this.driver = new webdriver.Builder()
        .usingServer('http://localhost:9515')
        .withCapabilities({
            chromeOptions: {
                binary: electronPath,
                args: [`app=${path.resolve()}`]
            }
        })
        .forBrowser('electron')
        .build();

        // find element(s) helper functions
        const findels = (args) => this.driver.findElements(args);
        const findel = (args) => this.driver.findElement(args);

        // find by helper functions
        const byClass = (args) => webdriver.By.className(args);
        const byId = (args) => webdriver.By.id(args);
        const byCss = (args) => webdriver.By.css(args);
        const byPath = (args) => webdriver.By.xpath(args);

        // grab group of elements
        this.getLogos = () => findels(
            byClass(logoStyles.logo)
        );

        this.getHighlightedLogo = () => findels(
            byClass(logoStyles.logoSelected)
        );

        this.getInputs = () => findels(
            byPath('//input')
        );

        // grab specific element
        this.getLogo = (dialect) => findel(
            byId(`test-logo-${dialect}`)
        );

        this.getInputField = (credential) => findel(
            byId(`test-input-${credential}`)
        );

        this.getConnectBtn = () => findel(
            byId('test-connect-button')
        );

        this.getDatabaseDropdown = () => findel(
            byId('test-database-dropdown')
        );

        // TODO: selenium has not wait for function, need a work around, WIP
        // this.waitForElement = async(getElementFun) => {
        //     console.log('waiting.....');
        //     let element;
        //     await delay(3000)
        //     .then( async() => {
        //         try {
        //             element = await getElementFun;
        //         }
        //         catch (err) {
        //             // return this.waitForElement until found
        //         }
        //         finally {
        //             return element;
        //         }
        //     });
        // };


        this.getDatabaseOptions = () => findel(
            byCss('.Select-option')
        );

        this.getTables = () => findel(
            byId('test-tables')
        );

        this.getLogs = () => findel(
            byId('test-logs')
        );

        this.getErrorMessage = () => findel(
            byId('test-error-message')
        );

        // user inputs
        this.fillInputs = async (testedDialect) => {
            USER_INPUT_FIELDS[testedDialect].forEach(credential => {
                this.getInputField(credential)
                .then(input => input.sendKeys(CREDENTIALS[testedDialect][credential]));
            });
        };

        this.wrongInputs = async (testedDialect) => {
            USER_INPUT_FIELDS[testedDialect].forEach(credential => {
                this.getInputField(credential)
                .then(input => input.sendKeys('blah'));
            });
        };

        // server
        this.getServerResponse = async (browser) => {
            const page = await browser.findElement(webdriver.By.xpath('//pre'));
            const text = await page.getText();
            return JSON.parse(text);
        };

    });

    // grab property of element
    const getClassOf = (element) => element.getAttribute('class');

    // TODO: replace delay times with a functions that waits for a change

    it('should open window',
    async () => {

        const title = await this.driver.getTitle();

        expect(title).to.equal('Plotly Desktop Connector');

    });

    it('should display five available dialect logos',
    async () => {

        const logos = await this.getLogos();

        expect(logos.length).to.equal(5);

    });

    it('should enter text into the text box',
    async () => {

        const inputs = await this.getInputs();
        const textinput = 'this is an input';

        inputs[0].sendKeys(textinput);
        expect(await inputs[0].getAttribute('value')).to.equal(textinput);

    });

    it('should clear input values if a new database dialect is selected',
    async () => {

        const inputs = await this.getInputs();
        const logos = await this.getLogos();

        logos[1].click();
        expect(await inputs[0].getAttribute('value')).to.equal('');

    });

    it('should have a single logo highlighted as selected matching the dialect',
    async () => {

        const testedDialect = DIALECTS.MARIADB;
        const logo = await this.getLogo(testedDialect);
        const highlightedLogo = await this.getHighlightedLogo();

        expect(await highlightedLogo.length).to.equal(1);
        expect(await logo.getAttribute('id')).to.contain(testedDialect);
        expect(await highlightedLogo[0].getAttribute('id')).to.contain(testedDialect);

    });

    it('should have an initial state of disconnected',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.DISCONNECTED}`;
        const btn = await this.getConnectBtn();

        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should have updated the config with new dialect value',
    async () => {

        const expectedClass = 'test-consistent-state';
        const testedDialect = DIALECTS.MYSQL;
        const logo = await this.getLogo(testedDialect);

        await logo.click()
        .then(await delay(500));
        const testClass = await getClassOf(logo);
        expect(testClass).to.contain(expectedClass);

    });

    it('should connect to the database using the inputs and selected dialect',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.CONNECTED}`;
        const testedDialect = DIALECTS.MYSQL;
        const btn = await this.getConnectBtn();

        // click on the evaluated dialect logo
        this.fillInputs(testedDialect)
        .then(await delay(500))
        // click to connect
        .then(await btn.click())
        .then(await delay(2000));
        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should show the database selector after connection',
    async () => {

        const expectedClass = 'test-connected';
        const databaseDropdown = this.getDatabaseDropdown();

        const testClass = await getClassOf(databaseDropdown);
        expect(testClass).to.contain(expectedClass);

    });

    it('should show a log with one logged item in the log',
    async () => {

        const expectedClass = 'test-1-entries';
        const logs = await this.getLogs();

        const testClass = await getClassOf(logs);
        expect(testClass).to.contain(expectedClass);

    });

    it('should not show a table preview',
    async () => {

        let error;
        try {
            error = await this.getTables();
        }
        catch (err) {
            error = err;
        }
        expect(error.toString()).to.contain('NoSuchElementError');

    });

    it('should show table previews when database is selected from dropdown',
    async () => {

        // TODO: debug how to get options from react-select
        // TODO: debug how to set a value into the react-select item
        const databaseDropdown = await this.getDatabaseDropdown();
        // click to open options
        await databaseDropdown.click();

        expect(await this.getDatabaseOptions().getAttribute('value')).to.equal('[]');

    });


    it('should disconnect when the disconnect button is pressed',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.DISCONNECTED}`;
        const btn = await this.getConnectBtn();

        await btn.click()
        .then(await delay(1000));
        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should receive a post to /connect, /tables, /query, /disconnect',
    async () => {
        // TODO: clean this whole thing

        // connect using the app
        const testedDialect = DIALECTS.MYSQL;
        const btn = await this.getConnectBtn();
        const logos = await this.getLogos();
        const logo = await this.getLogo(testedDialect);

        // clear inputs
        logos[4].click();
        logo.click();

        this.fillInputs(testedDialect)
        .then(await delay(2000))
        // click to connect
        .then(await btn.click());

        // setup a browser
        var plotly20 = new webdriver.Builder()
        .forBrowser('chrome')
        .build();

        // test -- /connect
        await plotly20.get('localhost:5000/connect');
        const connectResponse = await this.getServerResponse(plotly20);

        expect(connectResponse).to.have.property('error', null);

        // test /tables -- ask for preview of a database
        const database = 'plotly_datasets';
        await plotly20.get(`localhost:5000/tables?database=${database}`);
        const databasePreview = await this.getServerResponse(plotly20);

        expect(databasePreview).to.have.property('error', null);
        expect(databasePreview).to.have.property('tables');

        // test /query -- choose first table and send a query
        const table = Object.keys(databasePreview.tables[0])[0];
        await plotly20.get(`localhost:5000/query?statement=SELECT * FROM ${table} LIMIT 5`);
        const queryResponse = await this.getServerResponse(plotly20);
        expect(queryResponse.rows.length).to.equal(5);

        // test /disconnect --  
        await plotly20.get('localhost:5000/disconnect');
        const quitResponse = await this.getServerResponse(plotly20);
        expect(quitResponse).to.have.property('error', null);

        plotly20.quit();

    });

    it('should display an error when wrong credentials are enetered and the ' +
    'button state should be disconnected and the log should not update',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.ERROR}`;
        const testedDialect = DIALECTS.MYSQL;
        const btn = await this.getConnectBtn();

        this.wrongInputs(testedDialect)
        .then(await delay(500))
        // click to connect
        .then(await btn.click())
        .then(await delay(1000));

        const errorMessage = await this.getErrorMessage();
        const testClass = await getClassOf(btn);
        expect(testClass.includes(expectedClass)).to.equal(true);
        expect(await errorMessage.getText()).to.have.length.above(0);

    });


    after(async () => {
        await this.driver.quit();
    });

});
