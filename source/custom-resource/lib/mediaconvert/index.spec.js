/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';
const expect = require('chai').expect;
const path = require('path');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const lambda = require('./index.js');

const data = {
    JobTemplate: {
        Name: 'name'
    },
    Endpoints: [{
        Url: 'https://test.com'
    }]
};

const _config = {
    StackName: 'test',
    EndPoint: 'https://test.com',
    EnableMediaPackage: 'false'
};

const _mediaPackageConfig = {
    StackName: 'test',
    EndPoint: 'https://test.com',
    EnableMediaPackage: 'true'
};

const update_data = {
    JobTemplates: [{ Name: 'test_Ott_720p_Avc_Aac_16x9_qvbr' }]
};

describe('#MEDIACONVERT::', () => {
    afterEach(() => AWS.restore('MediaConvert'));

    describe('Create', () => {
        it('should return "SUCCESS" on create templates', async () => {
            AWS.mock('MediaConvert', 'createPreset', Promise.resolve());
            AWS.mock('MediaConvert', 'createJobTemplate', Promise.resolve(data));

            let response = await lambda.createTemplates(_config);
            expect(response).to.equal('success');
        });

        it('should use correct templates when MediaPackage is enabled', async () => {
            let name;

            AWS.mock('MediaConvert', 'createPreset', Promise.resolve());
            AWS.mock('MediaConvert', 'createJobTemplate', (params) => {
                name = params.Name;
                return Promise.resolve(data);
            });

            let response = await lambda.createTemplates(_mediaPackageConfig);
            expect(response).to.equal('success');
            expect(name.endsWith('_mvod')).to.be.true;
        });

        it('should fail when createJobTemplate throws an exception', async () => {
            AWS.mock('MediaConvert', 'createPreset', Promise.resolve());
            AWS.mock('MediaConvert', 'createJobTemplate', Promise.reject('ERROR'));

            await lambda.createTemplates(_config).catch(err => {
                expect(err).to.equal('ERROR');
            });
        });
    });

    describe('Describe', () => {
        it('should return "SUCCESS" on describeEndpoints', async () => {
            AWS.mock('MediaConvert', 'describeEndpoints', Promise.resolve(data));

            let response = await lambda.getEndpoint(_config);
            expect(response.EndpointUrl).to.equal('https://test.com');
        });

        it('should fail when describeEndpoints throws an exception', async () => {
            AWS.mock('MediaConvert', 'describeEndpoints', Promise.reject('ERROR'));

            await lambda.getEndpoint(_config).catch(err => {
                expect(err).to.equal('ERROR');
            });
        });
    });

    describe('Update', () => {
        it('should return "SUCCESS" on update templates', async () => {
            AWS.mock('MediaConvert', 'listJobTemplates', Promise.resolve(update_data));

            let response = await lambda.updateTemplates(_config);
            expect(response).to.equal('success');
        });

        it('should correctly handle when enable media package is set to false', async () => {
            const templatesData = {
                JobTemplates: [{ Name: 'test_Ott_720p_Avc_Aac_16x9_mvod' }]
            };

            let wasDeleteTemplateInvoked = false;
            let wasCreateTemplateInvoked = false;

            let toBeDeleted = [];
            let toBeCreated = [];

            AWS.mock('MediaConvert', 'listJobTemplates', Promise.resolve(templatesData));

            AWS.mock('MediaConvert', 'deleteJobTemplate', (params) => {
                wasDeleteTemplateInvoked = true;
                toBeDeleted.push(params.Name);

                return Promise.resolve();
            });

            AWS.mock('MediaConvert', 'createJobTemplate', (params) => {
                wasCreateTemplateInvoked = true;
                toBeCreated.push(params.Name);

                return Promise.resolve(data);
            });

            await lambda.updateTemplates(_config);
            expect(wasDeleteTemplateInvoked).to.be.true;
            expect(wasCreateTemplateInvoked).to.be.true;

            toBeDeleted.forEach(item => expect(item.endsWith('_mvod')).to.be.true);
            toBeCreated.forEach(item => expect(item.endsWith('_qvbr')).to.be.true);
        });

        it('should correctly handle when enable media package is set to true', async () => {
            let wasDeleteTemplateInvoked = false;
            let wasCreateTemplateInvoked = false;

            let toBeDeleted = [];
            let toBeCreated = [];

            AWS.mock('MediaConvert', 'listJobTemplates', Promise.resolve(update_data));

            AWS.mock('MediaConvert', 'deleteJobTemplate', (params) => {
                wasDeleteTemplateInvoked = true;
                toBeDeleted.push(params.Name);

                return Promise.resolve();
            });

            AWS.mock('MediaConvert', 'createJobTemplate', (params) => {
                wasCreateTemplateInvoked = true;
                toBeCreated.push(params.Name);

                return Promise.resolve(data);
            });

            await lambda.updateTemplates(_mediaPackageConfig);
            expect(wasDeleteTemplateInvoked).to.be.true;
            expect(wasCreateTemplateInvoked).to.be.true;

            toBeDeleted.forEach(item => expect(item.endsWith('_qvbr')).to.be.true);
            toBeCreated.forEach(item => expect(item.endsWith('_mvod')).to.be.true);
        });

        it('should fail when listJobTemplates throws an exception', async () => {
            AWS.mock('MediaConvert', 'listJobTemplates', Promise.reject('ERROR'));

            await lambda.updateTemplates(_config).catch(err => {
                expect(err).to.equal('ERROR');
            });
        });
    });

    describe('Delete', () => {
        it('should return "SUCCESS" on delete templates', async () => {
            AWS.mock('MediaConvert', 'deletePreset', Promise.resolve());
            AWS.mock('MediaConvert', 'deleteJobTemplate', Promise.resolve());

            let response = await lambda.deleteTemplates(_config);
            expect(response).to.equal('success');
        });

        it('should use correct templates when MediaPackage is enabled', async () => {
            let name;

            AWS.mock('MediaConvert', 'deletePreset', Promise.resolve());
            AWS.mock('MediaConvert', 'deleteJobTemplate', (params) => {
                name = params.Name;
                return Promise.resolve();
            });

            let response = await lambda.deleteTemplates(_mediaPackageConfig);
            expect(response).to.equal('success');
            expect(name.endsWith('_mvod')).to.be.true;
        });
    });
});
