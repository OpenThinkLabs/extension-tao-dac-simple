/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2015-2020 (original work) Open Assessment Technologies SA (under the project TAO-PRODUCT);
 */
define([
    'jquery',
    'lodash',
    'i18n',
    'tpl!taoDacSimple/controller/admin/line',
    'helpers',
    'ui/feedback',
    'ui/autocomplete',
    'ui/tooltip',
    'core/request',
    'ui/taskQueue/taskQueue',
    'ui/taskQueueButton/standardButton',
], function (
    $,
    _,
    __,
    lineTpl,
    helpers,
    feedback,
    autocomplete,
    tooltip,
    request,
    taskQueue,
    taskCreationButtonFactory
) {
    'use strict';

    /**
     * The warning message shown when all managers have been removed
     * @type {String}
     */
    var errorMsgManagePermission = __('You must have one role or user that have the manage permission on this element.');

    /**
     * tooltip instance that serves all methods with same tooltip data and its state
     * @type {Tooltip}
     */
    var errorTooltip;
    /**
     * Checks the managers, we need at least one activated manager.
     * @param {jQuery|Element|String} container
     * @returns {Boolean} Returns `true` if there is at least one manager in the list
     * @private
     */
    var _checkManagers = function (container) {
        var $managers = $(container).find('.privilege-GRANT:checked');
        var checkOk = true;

        if (!$managers.length) {
            checkOk = false;
        }
        return checkOk;
    };

    /**
     * Avoids to remove all managers
     * @param {jQuery|Element|String} container
     * @private
     */
    var _preventManagerRemoval = function(container){
        var $form = $(container).closest('form');
        var $submitter = $(':submit', $form);

        if (!_checkManagers($form)) {
            $submitter.addClass('disabled');
            errorTooltip = tooltip.warning($submitter, errorMsgManagePermission, {
                placement : 'bottom',
                trigger: "hover",
            });
            feedback().warning(errorMsgManagePermission);
        } else {
            $submitter.removeClass('disabled');
            if(errorTooltip){
                errorTooltip.dispose();
            }
        }
    };

    /**
     * Allow to enable / disable the access checkbox based on the state of the grant privilege
     * @param {jQuery|Element|String} container
     * @private
     */
    var _disableAccessOnGrant = function (container) {
        var $container = $(container);

        var $managersChecked = $container.find('.privilege-GRANT:checked').closest('tr');
        var $cantChangeWrite = $managersChecked.find('.privilege-WRITE');
        var $cantChangeRead = $managersChecked.find('.privilege-READ');

        var $managers = $container.find('.privilege-GRANT').not(':checked').closest('tr');
        var $canChangeWrite = $managers.find('.privilege-WRITE');
        var $canChangeRead = $managers.find('.privilege-READ');

        $canChangeWrite.removeClass('disabled');
        $canChangeRead.removeClass('disabled');

        $cantChangeWrite.addClass('disabled').prop('checked', true);
        $cantChangeRead.addClass('disabled').prop('checked', true);

        _preventManagerRemoval($container);
        _disableAccessOnWrite($container);
    };

    /**
     * Allow to enable / disable the access checkbox based on the state of the write privilege
     * @param {jQuery|Element|String} container
     * @private
     */
    var _disableAccessOnWrite = function (container) {
        var $container = $(container);

        var $writersChecked = $container.find('.privilege-WRITE:checked').closest('tr');
        var $cantChangeRead = $writersChecked.find('.privilege-READ');

        var $writers = $container.find('.privilege-WRITE').not(':checked').closest('tr');
        var $canChangeRead = $writers.find('.privilege-READ');

        $canChangeRead.removeClass('disabled');

        $cantChangeRead.addClass('disabled').prop('checked', true);
    };

    /**
     * Delete a permission row for a user/role
     * @param  {DOM Element} element DOM element that triggered the function
     * @private
     */
    var _deletePermission = function (element) {
        // 1. Get the user / role
        var $this = $(element);
        var $container = $this.closest('table');
        var type = $this.data('acl-type');
        var user = $this.data('acl-user');
        var label = $this.data('acl-label');

        // 2. Remove it from the list
        if (!_.isEmpty(type) && !_.isEmpty(user) && !_.isEmpty(label)) {
            $this.closest('tr').remove();
        }

        _preventManagerRemoval($container);
    };

    /**
     * Checks if a permission has already been added to the list.
     * Highlight the list if the permission is already in the list.
     * @param {jQuery|Element|String} container
     * @param {String} type role/user regarding what it will be added.
     * @param {String} id The identifier of the resource.
     * @returns {boolean} Returns true if the permission is already in the list
     * @private
     */
    var _checkPermission = function (container, type, id) {
        var $btn = $(container).find('button[data-acl-user="' + id + '"]'),
            $line = $btn.closest('tr');

        if ($line.length) {
            $line.effect('highlight', {}, 1500);
            return true;
        }

        return false;
    };

    /**
     * Add a new lines into the permissions table regarding what is selected into the add-* select
     * @param {jQuery|Element|String} container
     * @param {String} type role/user regarding what it will be added.
     * @param {String} id The identifier of the resource.
     * @param {String} label The label of the resource.
     * @private
     */
    var _addPermission = function (container, type, id, label) {
        var $container = $(container),
            $body = $container.find('tbody').first();

        // only add the permission if it's not already present in the list
        if (!_checkPermission($container, type, id)) {
            $body.append(lineTpl({
                type: type,
                user: id,
                label: label
            }));
            _disableAccessOnGrant($container);
        }
    };

    /**
     * Ensures that if you give the manage (GRANT) permission, access (WRITE and READ) permissions are given too
     * Listens all clicks on delete buttons to call the _deletePermission function
     * @param {jQuery|Element|String} container The container on which apply the listeners
     * @private
     */
    var _installListeners = function(container) {
        var $container = $(container);
        $container.on('click', '.privilege-GRANT:not(.disabled) ', function () {
            _disableAccessOnGrant($container);
        }).on('click', '.privilege-WRITE:not(.disabled) ', function () {
            _disableAccessOnWrite($container);
        }).on('click', '.delete_permission:not(.disabled)', function (event) {
            event.preventDefault();
            _deletePermission(this);
        });
    };


    /**
     * Installs a search purpose autocompleter onto an element.
     * @param {jQuery|Element|String} element The element on which install the autocompleter
     * @param {jQuery|Element|String} appendTo Container where suggestions will be appended. Default value document.body. Make sure to set position: absolute or position: relative for that element
     * @param {Function} onSelectItem - The selection callback
     * @returns {Autocompleter} Returns the instance of the autocompleter component
     */
    var _searchFactory = function (element, appendTo, onSelectItem) {
        var autocompleteOptions = {
            isProvider: true,
            preventSubmit: true,
            appendTo: appendTo,
        };
        if (_.isFunction(onSelectItem)) {
            autocompleteOptions.onSelectItem = onSelectItem;
        }
        return autocomplete(element, autocompleteOptions);
    };

    var mainCtrl = {
        start: function start () {

            var $container = $('.permission-container');
            var $form = $('form', $container);
            var $oldSubmitter = $(':submit', $form);

            _disableAccessOnGrant('#permissions-table-users');
            _disableAccessOnGrant('#permissions-table-roles');

            // install autocomplete for user add
            _searchFactory('#add-user', '#add-user-wrapper', function (event, value, label) {
                $('#add-user').focus();
                _addPermission('#permissions-table-users', 'user', value, label);
            });

            // install autocomplete for role add
            _searchFactory('#add-role','#add-role-wrapper', function (event, value, label) {
                $('#add-role').focus();
                _addPermission('#permissions-table-roles', 'role', value, label);
            });

            // ensure that if you give the manage (GRANT) permission, access (WRITE and READ) permissions are given too
            _installListeners('#permissions-table-users');
            _installListeners('#permissions-table-roles');

            //find the old submitter and replace it with the new component
            var taskCreationButton = taskCreationButtonFactory({
                type : 'info',
                icon : 'save',
                title : __('Save'),
                label : __('Save'),
                taskQueue : taskQueue,
                taskCreationUrl : $form.attr('action'),
                taskCreationData : function taskCreationData() {
                    return $form.serializeArray();
                },
                taskReportContainer : $container
            }).on('finished', function(result){
                if (result.task
                    && result.task.report
                    && _.isArray(result.task.report.children)
                    && result.task.report.children.length
                    && result.task.report.children[0]) {
                    if(result.task.report.children[0].type === 'success'){
                        feedback().success(__('Permissions saved'));
                    } else {
                        feedback().error( __('Error'));
                    }
                }
            }).on('error', function(err){
                //format and display error message to user
                feedback().error(err);
            }).render($oldSubmitter.closest('.bottom-bar'));

            //replace the old submitter with the new one and apply its style
            $oldSubmitter.replaceWith(taskCreationButton.getElement().css({float: 'right'}));

            $form.on('submit', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
        }
    };

    return mainCtrl;
});
