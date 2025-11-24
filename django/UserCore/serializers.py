# UserCore/serializers.py

from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import CustomUser

LANG_CHOICES = {'en', 'fr', 'de', 'bz'}  # <- canonical server-side set

class UserSerializer(serializers.ModelSerializer):
    # Roles are write-only here; representation adds them back (see to_representation)
    roles = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False  # <- important for PATCH /users/me/
    )

    is_demo = serializers.SerializerMethodField(read_only=True)
    demo_expires_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'roles', 'password', 'lang',
            'is_demo', 'demo_expires_at',
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate_lang(self, value):
        v = (value or '').lower()
        if v not in LANG_CHOICES:
            raise serializers.ValidationError("Unsupported language code.")
        return v

    def get_is_demo(self, obj):
        return obj.groups.filter(name="demo").exists()

    def get_demo_expires_at(self, obj):
        acct = getattr(obj, "demo_account", None)
        if not acct or getattr(acct, "expired", True):
            return None
        return acct.expires_at.isoformat()

    def create(self, validated_data):
        lang = validated_data.pop('lang', None)
        roles = validated_data.pop('roles', [])
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        if lang:
            user.lang = lang
        user.save()

        for role in roles:
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)
        return user

    def update(self, instance, validated_data):
        """
        - Non-admins can change: first_name, last_name, lang
        - Admins can also set roles via write-only `roles`
        """
        request = self.context.get('request')
        is_admin = bool(
            request and (
                request.user.is_superuser or
                request.user.groups.filter(name='admin').exists()
            )
        )

        # Handle allowed simple fields for everyone
        for field in ('first_name', 'last_name', 'lang'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        # Roles: admin only
        incoming_roles = validated_data.pop('roles', None)
        if incoming_roles is not None:
            if not is_admin:
                raise serializers.ValidationError({"roles": "Only admins can change roles."})
            # Replace group set with the new list
            groups = []
            for r in incoming_roles:
                g, _ = Group.objects.get_or_create(name=str(r))
                groups.append(g)
            instance.groups.set(groups)

        instance.save()
        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['roles'] = [g.name for g in instance.groups.all()]
        return rep
