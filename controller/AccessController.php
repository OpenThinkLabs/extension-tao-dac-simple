<?php
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
 * Copyright (c) 2014 (original work) Open Assessment Technologies SA;
 *
 *
 */

namespace oat\taoDacSimple\controller;

use oat\taoDacSimple\model\accessControl\data\implementation\DataBaseAccess;
use oat\tao\model\accessControl\data\AclProxy;
use oat\taoDacSimple\model\AdminService;

/**
 * Sample controller
 *
 * @author Open Assessment Technologies SA
 * @package taoDacSimple
 * @subpackage actions
 * @license GPL-2.0
 *
 */
class AccessController extends \tao_actions_CommonModule
{

    private $dataAccess = null;

    /**
     * initialize the services
     */
    public function __construct()
    {
        parent::__construct();
        $this->dataAccess = new DataBaseAccess();
    }

    /**
     * A possible entry point to tao
     * @todo enable requiresPrivilege uri GRANT
     */
    public function index()
    {
        
        $resourceUri = $this->hasRequestParameter('uri') 
            ? \tao_helpers_Uri::decode($this->getRequestParameter('uri'))
            : \tao_helpers_Uri::decode($this->getRequestParameter('classUri'));
        $resource = new \core_kernel_classes_Resource($resourceUri);
        
        $accessRights = AdminService::getUsersPrivileges($resourceUri);
        $userList = $this->getUserList();
        $roleList = $this->getRoleList();
        
        $this->setData('privileges', AclProxy::getPrivilegeLabels());
        
        $userData = array();
        foreach (array_keys($accessRights) as $uri) {
            if (isset($userList[$uri])) {
                $userData[$uri] = array(
                    'label' => $userList[$uri],
                    'isRole' => false
                );
                unset($userList[$uri]);
            } elseif (isset($roleList[$uri])) {
                $userData[$uri] = array(
                    'label' => $roleList[$uri],
                    'isRole' => true
                );
                unset($roleList[$uri]);
            } else {
                \common_Logger::d('unknown user '.$uri);
            }
        }
        
        $this->setData('users', $userList);
        $this->setData('roles', $roleList);
        
        $this->setData('userPrivileges', $accessRights);
        $this->setData('userData', $userData);
        
        
        $this->setData('uri', $resourceUri);
        $this->setData('label', $resource->getLabel());
        
        $this->setView('AccessController/index.tpl');
    }


    /**
     * get the list of users
     * @param array $resourceIds
     * @return array key => value with key = user Uri and value = user Label
     */
    protected function getUserList()
    {
        $userService = \tao_models_classes_UserService::singleton();
        $users = array();
        foreach ($userService->getAllUsers() as $user) {
            $users[$user->getUri()] = $user->getLabel();
        }
        
        return $users;
    }

    /**
     * get the list of roles
     * @param array $resourceIds
     * @return array key => value with key = user Uri and value = user Label
     */
    protected function getRoleList()
    {
        $roleService = \tao_models_classes_RoleService::singleton();
        
        $roles = array();
        foreach ($roleService->getAllRoles() as $role) {
            $roles[$role->getUri()] = $role->getLabel();
        }

        return $roles;
    }

    /**
     * add privileges for a group of users on resources. It works for add or modify privileges
     * @return bool
     */
    public function savePrivileges()
    {

        $users = $this->getRequest()->getParameter('users');
        $resourceIds = (array)$this->getRequest()->getParameter('resource_id');
        
        // cleanup uri param
        if ($this->hasRequestParameter('uri')) {
            $resourceId = $this->getRequest()->getParameter('uri');
        } else {
            $resourceId = (string)$this->getRequest()->getParameter('resource_id');
        }

        // cleanup privilege param
        if ($this->hasRequestParameter('privileges')) {
            $privileges = $this->getRequestParameter('privileges');
        } else {
            $privileges = array();
            foreach ($this->getRequest()->getParameter('users') as $userId => $data) {
                unset($data['type']);
                $privileges[$userId] = array_keys($data);
            }
        }
        
        // Check if there is still a owner on this resource
        if (!$this->validateRights($privileges)) {
            \common_Logger::e('Cannot save a list without a fully privileged user');
            return $this->returnJson(array(
            	'success' => false
            ), 500);
        }

        
        $this->dataAccess->removeAllPrivileges(array($resourceId));
        foreach ($privileges as $userId => $privilegeIds) {
            $this->dataAccess->addPrivileges($userId, $resourceId, $privilegeIds);
        }
        
        return $this->returnJson(array(
        	'success' => true
        ));
        
    }

    /**
     * Check if the array to save contains a user that has all privileges
     * 
     * @param array $usersPrivileges
     * @return bool
     */
    protected function validateRights($usersPrivileges)
    {

        foreach ($usersPrivileges as $user => $options) {
            if ($options == AclProxy::getExistingPrivileges()) {
                return true;
            }
        }
        return false;
    }

}
