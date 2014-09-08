define([
    'jquery',
    'i18n',
    'tpl!taoDacSimple/controller/line',
    'helpers',
    'select2',
    'tooltipster'
    ], function($, __, lineTpl, helpers){
        'use strict';

        var userSelect,
            roleSelect,
            tooltipConfig = {
                content : __('You must have one role or user that have the manage permission on this element.'),
                theme : 'tao-info-tooltip',
                trigger: 'hover'
            } ;

        /**
         * Provide a method the deactivate UI component that provide manager deletation
         */
        var _preventManagerRemoval = function(){
            var $managers = $('#permissions-table').find('.privilege-GRANT:checked'),
                $canAccess = $managers.closest('tr').find('.privilege-WRITE'),
                $deleteButtons = $managers.closest('tr').find('.delete_permission');

            $('.tooltip').tooltipster(tooltipConfig).tooltipster('disable');
            $managers.closest('label').tooltipster('enable');
            $canAccess.closest('label').tooltipster('enable'),
            $deleteButtons.tooltipster('enable');


            if($managers.length > 1){
                $deleteButtons.removeClass("disabled").tooltipster('disable');
                $canAccess.removeClass('disabled').closest('label').tooltipster('disable');
                $managers.removeClass('disabled').closest('label').tooltipster('disable');
            }else{
                $deleteButtons.addClass("disabled").tooltipster('enable');
                $canAccess.addClass('disabled').closest('label').tooltipster('enable');
                $managers.addClass("disabled").closest('label').tooltipster('enable');
            }
        }

        /**
         * Delete a permission row for a user/role
         * @param  {DOM Element} element DOM element that triggered the function
         */
        var _deletePermission = function(element) {
            // 1. Get the user / role
            var $this = $(element),
                type = $this.data('acl-type'),
                user = $this.data('acl-user'),
                label = $this.data('acl-label');

            if( typeof type !== "undefined" &&
                typeof user !== "undefined" &&
                typeof label !== "undefined" &&
                type !== "" &&
                user !== "" &&
                label !== ""){
                // 2. Add it to the select & remove the line
                switch(type){
                    case 'user':
                        $('#add-user').append($('<option/>',{ text : label , value : user }));
                        $this.closest('tr').remove();
                        break;
                    case 'role':
                        $('#add-role').append($('<option/>',{ text : label , value : user }));
                        $this.closest('tr').remove();
                        break;
                    default:
                        break;
                }
            }
            _preventManagerRemoval();
        }
        /**
         * Add a new lines into the permissions table regarding what is selected into the add-* select
         * @param {string} type role/user regarding what it will be added.
         */
        var _addPermission = function(type) {
            var $table = $('#permissions-table'),
                body = $table.find('tbody')[0],
                selection = [];
            //1. Get a list of all elements to add
            switch(type){
                case 'user':
                    $.each(userSelect.select2("data"), function(index, val) {
                        // Push each selected element into an array
                        selection.push({
                            type : 'user',
                            user : val.id,
                            label : val.text
                        });
                        // Remove them from DOM
                        userSelect.find('option[value="' + val.id + '"]').remove();
                    });
                    // Reset Select2 tag display
                    userSelect.select2("val","");
                    break;
                case 'role':
                    $.each(roleSelect.select2("data"), function(index, val) {
                        // Push each selected element into an array
                        selection.push({
                            type : 'role',
                            user : val.id,
                            label : val.text
                        });
                        // Remove them from DOM
                        roleSelect.find('option[value="' + val.id + '"]').remove();
                    });
                    // Reset Select2 tag display
                    roleSelect.select2("val","");
                    break;
                default:
                    break;
            }
            // 2. Inject them into the table
            $.each(selection, function(index,val) {
                $(body).append(lineTpl(val));
            });
        }


        var mainCtrl = {
            'start' : function(){

                _preventManagerRemoval();
                userSelect = $('#add-user').select2();
                roleSelect = $('#add-role').select2();


                /**
                 * Listen clicks on add user button
                 */
                $('#add-user-btn').on('click', function(event) {
                    event.preventDefault();
                    _addPermission('user');
                });
                /**
                 * Listen clicks on add role button
                 */
                $('#add-role-btn').on('click', function(event) {
                    event.preventDefault();
                    _addPermission('role');
                });

                /**
                 * Ensure that if you give the manage (GRANT) permission, access (WRITE) persmission is given too
                 * &
                 * Listen all clicks on delete buttons to call the _deletePersmission function
                 */
                $('#permissions-table').on('click', '.privilege-GRANT:not(.disabled) ', function() {
                    if ($(this).is(':checked') != []) {
                        var accessCheckbox = $(this).closest('tr').find('.privilege-WRITE').not(':checked')[0];
                        $(accessCheckbox).click();
                    };
                    _preventManagerRemoval();
                }).on('click', '.delete_permission:not(.disabled)', function(event) {
                    event.preventDefault();
                    _deletePermission(this);
                });

            }
        }
        return mainCtrl;
    })
