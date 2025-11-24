from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.apps import apps


class Command(BaseCommand):
    help = 'Create default groups and assign permissions'

    def handle(self, *args, **options):
        # Define the groups you want to create
        groups = {
            'admin': {
                'permissions': 'all',
            },
            'analytics': {
                'permissions': ['view'],  # Analytics can only view data
            }, 

            'teacher': {
            'permissions': ['view'],
            'additional_permissions': {
                'allowed': ['add', 'change', 'delete'],
                'excluded_models': ['annee', 'etape', 'catalogue', 'niveau', 'matiere', 'groupagedata', 'item', 'user','eleve']  
            }
}
        }

        for group_name, group_data in groups.items():
            group, created = Group.objects.get_or_create(name=group_name)

            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group: {group_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Group {group_name} already exists'))

            if group_data['permissions'] == 'all':
                # Admin gets all permissions
                permissions = Permission.objects.all()
            else:
                # Assign permissions based on the allowed actions (view, change, delete)
                permissions = []
                actions = group_data['permissions']

                for model in apps.get_models():
                    content_type = ContentType.objects.get_for_model(model)
                    # If teacher, exclude certain models
                    if group_name == 'teacher' and model._meta.model_name in group_data.get('excluded_models', []):
                        continue
                    for action in actions:
                        perm = Permission.objects.filter(content_type=content_type, codename=f'{action}_{model._meta.model_name}')
                        permissions.extend(perm)

            # Assign permissions to the group
            group.permissions.set(permissions)
            self.stdout.write(self.style.SUCCESS(f'Assigned permissions to group: {group_name}'))
