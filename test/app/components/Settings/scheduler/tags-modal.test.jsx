import React from 'react';
import {mount, configure} from 'enzyme';

import Adapter from 'enzyme-adapter-react-16';

import {wait} from '../../../utils';

const TagModal = require('../../../../../app/components/Settings/scheduler/modals/tags-modal/tags-modal.jsx').TagsModal;
const ColorPicker = require('../../../../../app/components/Settings/scheduler/pickers/color-picker');

const mockTags = [{id: 'id', name: 'Tag 1', color: '#ffffff'}];

const mockStore = {
    getState: () => {}
};

describe('Tag Modal Tests', () => {
    beforeAll(() => {
        configure({adapter: new Adapter()});
        // workaround `Error: Not implemented: HTMLCanvasElement.prototype.getContext`
        HTMLCanvasElement.prototype.getContext = function() {
            return null;
        };
    });

    it('should allow you to create tags', async () => {
        const createTag = jest.fn(v => Promise.resolve(v));
        const component = mount(<TagModal store={mockStore} open={true} createTag={createTag} />);

        component.find('form').simulate('submit', {
            target: [
                {
                    value: 'Tag name'
                }
            ]
        });

        await wait();
        expect(createTag).toHaveBeenCalledWith({
            name: 'Tag name',
            color: component.state('color')
        });
    });

    it('should allow tags to be deleted', async () => {
        const deleteTag = jest.fn(v => Promise.resolve(v));
        const component = mount(<TagModal store={mockStore} open={true} tags={mockTags} deleteTag={deleteTag} />);

        component.find('.delete').simulate('click');
        component.update();
        component.find('.delete-button').simulate('click');

        await wait();
        expect(deleteTag).toHaveBeenCalledWith(mockTags[0].id);
    });

    it('should allow tags to be edited', () => {
        const updateTag = jest.fn(v => Promise.resolve(v));
        const component = mount(<TagModal store={mockStore} open={true} tags={mockTags} updateTag={updateTag} />);

        component
            .find('.color-box')
            .at(1)
            .simulate('click');
        component.update();

        component
            .find('input')
            .at(1)
            .simulate('change', {
                target: {
                    value: '#fff'
                }
            });

        return component
            .find(ColorPicker)
            .at(1)
            .instance()
            .props.onClickAway()
            .then(() => {
                expect(updateTag).toHaveBeenCalledWith(mockTags[0].id, {color: '#ffffff'});
            });
    });

    it('should set an error message on edit failures', () => {
        const updateTag = jest.fn(() => Promise.reject({error: {message: 'Mock error'}}));
        const createTag = jest.fn(() => Promise.reject({error: {message: 'Mock create error'}}));
        const component = mount(
            <TagModal store={mockStore} open={true} tags={mockTags} createTag={createTag} updateTag={updateTag} />
        );

        component
            .find('.color-box')
            .at(1)
            .simulate('click');
        component.update();

        component
            .find('input')
            .at(1)
            .simulate('change', {
                target: {
                    value: '#fff'
                }
            });

        return component
            .find(ColorPicker)
            .at(1)
            .instance()
            .props.onClickAway()
            .then(() => expect(component.state('error')).toBe('Mock error'))
            .then(() =>
                component.instance().handleCreate({
                    preventDefault: () => {},
                    target: [{value: 'value'}]
                })
            )
            .then(() => {
                expect(component.state('error')).toBe('Mock create error');
            });
    });
});
