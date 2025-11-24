from django.contrib import admin  
 
from .models import CustomUser  
  
from django import forms
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django import forms
from django.contrib.auth.admin import UserAdmin

# Custom form to include the lang field and roles
class CustomUserForm(forms.ModelForm):
    roles = forms.ModelMultipleChoiceField(
        queryset=Group.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text="Select roles for the user."
    )

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'lang', 'first_name', 'last_name', 'password', 'is_active', 'is_staff', 'is_superuser')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:  # If editing an existing user
            self.fields['roles'].initial = self.instance.groups.all()

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
        if user.pk:
            user.groups.set(self.cleaned_data['roles'])  # Assign selected groups to the user
        return user

# Custom UserAdmin to manage the CustomUser model in the admin panel
class CustomUserAdmin(UserAdmin):
    form = CustomUserForm

    # Customize the fieldsets to include the lang field
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('lang',)}),  # Add 'lang' field in the admin interface
    )

    # Customize the list display to show the lang field
    list_display = ('username', 'email', 'lang', 'first_name', 'last_name', 'is_staff', 'is_active')

    # Add the lang field to the add_fieldsets
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'lang', 'password1', 'password2', 'is_active', 'is_staff'),
        }),
    )

# Register the CustomUserAdmin with the CustomUser model
admin.site.register(CustomUser, CustomUserAdmin)
